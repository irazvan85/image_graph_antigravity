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

    def analyze(self, image_path: str, use_llm=False, api_key=""):
        if use_llm:
            res = self.analyze_with_llm(image_path, api_key)
            if res: return res
            # Fallback to local if LLM fails
            
        self._load_models()
        try:
            image = Image.open(image_path).convert('RGB')
        except Exception as e:
            print(f"Error opening image {image_path}: {e}")
            return None

        # 1. Generate Caption
        inputs = self.blip_processor(image, return_tensors="pt").to(self.device)
        out = self.blip_model.generate(**inputs, max_new_tokens=50)
        caption = self.blip_processor.decode(out[0], skip_special_tokens=True)

        # 2. Extract OCR
        ocr_result = self.reader.readtext(image_path, detail=0)
        ocr_text = " ".join(ocr_result)

        # 3. Generate Embedding
        embedding = self.clip_model.encode(image)
        
        return {
            "caption": caption,
            "ocr_text": ocr_text,
            "embedding": embedding.tolist() # Convert to list for storage
        }

analyzer = ImageAnalyzer() 
