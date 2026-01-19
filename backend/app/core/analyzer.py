import os
import json
import torch
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
from sentence_transformers import SentenceTransformer
import easyocr
import numpy as np
import google.generativeai as genai

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

    def analyze_with_llm(self, image_path: str, api_key: str):
        if not api_key:
            return None
            
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
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
            
            return {
                "caption": data.get("caption", ""),
                "ocr_text": ocr_text,
                "embedding": embedding.tolist(),
                "tags": data.get("tags", [])
            }
        except Exception as e:
            print(f"LLM Error: {e}")
            return None

    def analyze_text(self, file_path: str):
        self._load_models()
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading text file {file_path}: {e}")
            return None

        # Truncate content for CLIP (usually max 77 tokens, but for sentence-transformers we just give it a chunk)
        # SentenceTransformer handles longer text better than raw CLIP, but we limit for speed/memory
        summary_text = content[:500] 

        # Generate embedding for text
        # CLIP ViT-B-32 in SentenceTransformer handles text as well
        embedding = self.clip_model.encode(summary_text)

        # Extract keywords (simple heuristic: words > 3 chars, split by lines/space)
        words = [w.strip(".,!?;:()[]{}").lower() for w in summary_text.split() if len(w) > 4]
        stop_words = {'the', 'and', 'this', 'that', 'with', 'from', 'image', 'picture', 'photo', 'about', 'there', 'their'}
        tags = list(set([w for w in words if w not in stop_words]))[:10]

        return {
            "caption": summary_text[:100] + "...", # Use start of text as caption
            "content": content,
            "embedding": embedding.tolist(),
            "tags": tags
        }

    def analyze(self, file_path: str, use_llm=False, api_key=""):
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.txt':
            return self.analyze_text(file_path)

        if use_llm:
            res = self.analyze_with_llm(file_path, api_key)
            if res: return res
            
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
        
        return {
            "caption": caption,
            "ocr_text": ocr_text,
            "embedding": embedding.tolist()
        }

analyzer = ImageAnalyzer() 
