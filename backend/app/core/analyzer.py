import os
import time
import json
import base64
import torch
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
from sentence_transformers import SentenceTransformer
import easyocr
import numpy as np
import google.generativeai as genai
from openai import OpenAI

class ImageAnalyzer:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.clip_model = None
        self.blip_processor = None
        self.blip_model = None
        self.reader = None

    def _load_models(self):
        if self.clip_model is not None:
            return

        print(f"Loading models on {self.device}...")
        
        # Load CLIP for embeddings
        self.clip_model = SentenceTransformer('clip-ViT-B-32')
        
        # Load BLIP for captioning
        self.blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        self.blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(self.device)
        
        # Load EasyOCR
        self.reader = easyocr.Reader(['en'], gpu=(self.device == "cuda"))
        print("Models loaded.")

    def analyze_with_llm(self, image_path: str, api_key: str, model_id: str = "gemini-1.5-flash-latest"):
        if not api_key:
            return {"error": "Missing API Key", "method": "Gemini Deep AI"}
            
        start_time = time.perf_counter()
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_id)
            
            img = Image.open(image_path)
            prompt = "Analyze this image and provide: 1. A detailed caption. 2. A list of key entities/concepts found in the image. Format as JSON with 'caption' and 'tags' keys."
            
            response = model.generate_content([prompt, img])
            # Basic parsing of JSON from response text
            text = response.text
            # Simple cleanup if LLM wraps in code blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
                
            data = json.loads(text)
            
            # We still need CLIP embedding for graph similarity
            self._load_models() # Ensure clip is loaded
            embedding = self.clip_model.encode(img)
            
            # OCR is optional if we have LLM, but let's keep it for precision
            ocr_result = self.reader.readtext(image_path, detail=0)
            ocr_text = " ".join(ocr_result)
            
            duration = time.perf_counter() - start_time
            return {
                "caption": data.get("caption", ""),
                "ocr_text": ocr_text,
                "embedding": embedding.tolist(),
                "tags": data.get("tags", []),
                "metadata": {"duration": duration, "method": "Gemini Deep AI"}
            }
        except Exception as e:
            err_msg = str(e)
            print(f"LLM Error: {err_msg}")
            return {"error": err_msg, "method": "Gemini Deep AI"}

    def analyze_with_openai(self, image_path: str, api_key: str, model_id: str = "gpt-4o-mini"):
        if not api_key:
            return {"error": "Missing OpenAI API Key", "method": "OpenAI Deep AI"}
            
        start_time = time.perf_counter()
        try:
            client = OpenAI(api_key=api_key)
            
            with open(image_path, "rb") as image_file:
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')
            
            prompt = "Analyze this image and provide: 1. A detailed caption. 2. A list of key entities/concepts found in the image. Format as JSON with 'caption' and 'tags' keys. Do not include markdown formatting like ```json."
            
            response = client.chat.completions.create(
                model=model_id,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            text = response.choices[0].message.content
            data = json.loads(text)
            
            # Use local models for embedding and OCR
            self._load_models()
            img = Image.open(image_path)
            embedding = self.clip_model.encode(img)
            
            ocr_result = self.reader.readtext(image_path, detail=0)
            ocr_text = " ".join(ocr_result)
            
            duration = time.perf_counter() - start_time
            return {
                "caption": data.get("caption", ""),
                "ocr_text": ocr_text,
                "embedding": embedding.tolist(),
                "tags": data.get("tags", []),
                "metadata": {"duration": duration, "method": f"OpenAI ({model_id})"}
            }
        except Exception as e:
            err_msg = str(e)
            print(f"OpenAI Error: {err_msg}")
            return {"error": err_msg, "method": "OpenAI Deep AI"}

    def analyze_text(self, file_path: str, use_llm=False, api_key="", model_id="gemini-1.5-flash-latest", provider="gemini"):
        start_time = time.perf_counter()
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading text file {file_path}: {e}")
            return None

        summary_text = content[:1000] # Give more context to LLM
        
        if use_llm:
            if provider == "openai":
                res = self._analyze_text_openai(summary_text, api_key, model_id)
            else:
                res = self._analyze_text_gemini(summary_text, api_key, model_id)
            
            if res and "error" not in res:
                self._load_models()
                embedding = self.clip_model.encode(summary_text[:500])
                duration = time.perf_counter() - start_time
                return {
                    "caption": res.get("summary", ""),
                    "content": content,
                    "embedding": embedding.tolist(),
                    "tags": res.get("tags", []),
                    "metadata": {"duration": duration, "method": f"{provider.upper()} Text Deep AI"}
                }
            elif res and "error" in res:
                return res

        # Fallback / Local Analysis
        self._load_models()
        embedding = self.clip_model.encode(summary_text[:500])
        
        words = [w.strip(".,!?;:()[]{}").lower() for w in summary_text[:500].split() if len(w) > 4]
        stop_words = {'the', 'and', 'this', 'that', 'with', 'from', 'image', 'picture', 'photo', 'about', 'there', 'their'}
        tags = list(set([w for w in words if w not in stop_words]))[:10]

        duration = time.perf_counter() - start_time
        return {
            "caption": summary_text[:100] + "...",
            "content": content,
            "embedding": embedding.tolist(),
            "tags": tags,
            "metadata": {"duration": duration, "method": "Local Text Analysis"}
        }

    def _analyze_text_gemini(self, text, api_key, model_id):
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_id)
            prompt = f"Summarize this text in 100 chars and extract 5-10 keywords as JSON with 'summary' and 'tags' keys:\n\n{text}"
            response = model.generate_content(prompt)
            res_text = response.text
            if "```json" in res_text:
                res_text = res_text.split("```json")[1].split("```")[0]
            elif "```" in res_text:
                res_text = res_text.split("```")[1].split("```")[0]
            return json.loads(res_text)
        except Exception as e:
            return {"error": str(e)}

    def _analyze_text_openai(self, text, api_key, model_id):
        try:
            client = OpenAI(api_key=api_key)
            prompt = f"Summarize this text in 100 chars and extract 5-10 keywords as JSON with 'summary' and 'tags' keys:\n\n{text}"
            response = client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return {"error": str(e)}

    def analyze(self, file_path: str, use_llm=False, api_key="", model_id="gemini-1.5-flash-latest", provider="gemini"):
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.txt':
            return self.analyze_text(file_path, use_llm, api_key, model_id, provider)

        start_time = time.perf_counter()
        if use_llm:
            if provider == "openai":
                res = self.analyze_with_openai(file_path, api_key, model_id)
            else:
                res = self.analyze_with_llm(file_path, api_key, model_id)
                
            if res and "error" not in res: 
                return res
            elif res and "error" in res:
                # Propagate error so worker can log it before fallback
                return res
            
        self._load_models()
        try:
            image = Image.open(file_path).convert('RGB')
        except Exception as e:
            print(f"Error opening image {file_path}: {e}")
            return None

        # 1. Generate Caption
        inputs = self.blip_processor(image, return_tensors="pt").to(self.device)
        out = self.blip_model.generate(**inputs, max_new_tokens=50)
        caption = self.blip_processor.decode(out[0], skip_special_tokens=True)

        # 2. Extract OCR
        ocr_result = self.reader.readtext(file_path, detail=0)
        ocr_text = " ".join(ocr_result)

        # 3. Generate Embedding
        embedding = self.clip_model.encode(image)
        
        duration = time.perf_counter() - start_time
        return {
            "caption": caption,
            "ocr_text": ocr_text,
            "embedding": embedding.tolist(),
            "metadata": {"duration": duration, "method": "Local (BLIP/OCR)"}
        }

analyzer = ImageAnalyzer() 
