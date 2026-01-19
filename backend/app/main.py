from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import json
from app.core.worker import worker
from app.core.graph import graph_builder
from app.db.storage import db

app = FastAPI(title="ImageGraph API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScanRequest(BaseModel):
    path: str
    use_llm: bool = False
    api_key: str = ""
    model_id: str = "gemini-1.5-flash-latest"
    provider: str = "gemini"
    base_url: str = ""

@app.get("/")
def read_root():
    return {"message": "ImageGraph Backend is running"}

@app.post("/scan")
def scan_folder(request: ScanRequest, background_tasks: BackgroundTasks):
    if not os.path.isdir(request.path):
        raise HTTPException(status_code=400, detail="Invalid directory path")
    
    started = worker.start_scan(request.path, request.use_llm, request.api_key, request.model_id, request.provider, request.base_url)
    if not started:
        raise HTTPException(status_code=409, detail="Scan already in progress")
        
    return {"status": "Scan started", "path": request.path, "llm": request.use_llm, "model": request.model_id, "provider": request.provider}

class ModelRequest(BaseModel):
    api_key: str = ""
    provider: str = "gemini"
    base_url: str = "http://localhost:1234/v1"

@app.post("/models")
def list_models(request: ModelRequest):
    try:
        if request.provider == "openai":
            # For OpenAI, we return known vision models as listing them is more complex via API
            return {"models": [
                {"id": "gpt-4o", "name": "GPT-4o (High Performance)"},
                {"id": "gpt-4o-mini", "name": "GPT-4o Mini (Fast & Cheap)"}
            ]}
        
        if request.provider == "lmstudio":
            import requests
            url = f"{request.base_url.rstrip('/')}/models"
            resp = requests.get(url, timeout=5)
            if resp.ok:
                data = resp.json()
                # Local models usually in data['data']
                models = [{"id": m['id'], "name": m['id']} for m in data.get('data', [])]
                return {"models": models}
            else:
                raise Exception(f"LM Studio returned {resp.status_code}")

        import google.generativeai as genai
        genai.configure(api_key=request.api_key)
        # Filter for models that support generating content from images
        models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                # We prioritize Gemini 1.5+ for vision
                if 'gemini' in m.name:
                    models.append({"id": m.name, "name": m.display_name})
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/stop")
def stop_scan():
    stopped = worker.stop_scan()
    if not stopped:
        raise HTTPException(status_code=400, detail="No scan in progress")
    return {"status": "Scan stop requested"}

@app.get("/progress")
def get_progress():
    return worker.get_progress()

@app.get("/graph")
def get_graph(sim_threshold: float = 0.7):
    # Update threshold if needed in builder (naive implementation)
    graph_builder.sim_threshold = sim_threshold
    elements = graph_builder.export_cytoscape()
    return {"elements": elements}

@app.get("/image/{image_id}")
def get_image_metadata(image_id: int):
    # This is a bit inefficient without a specific DB get method, but works for now
    images = db.get_all_images()
    for img in images:
        if img[0] == image_id:
            return {
                "id": img[0],
                "path": img[1],
                "caption": img[2],
                "tags": json.loads(img[3]) if img[3] else []
            }
    raise HTTPException(status_code=404, detail="Image not found")

@app.get("/image_content/{image_id}")
def get_image_content(image_id: int):
    images = db.get_all_images()
    for img in images:
        if img[0] == image_id:
             if os.path.exists(img[1]):
                 return FileResponse(img[1])
    raise HTTPException(status_code=404, detail="Image not found")

@app.get("/export")
def export_graph():
    elements = graph_builder.export_cytoscape()
    return {"graph": elements}

@app.post("/reset")
def reset_database():
    if worker.status == "scanning":
        raise HTTPException(status_code=409, detail="Cannot reset while scanning")
    db.clear_database()
    return {"status": "Database cleared"}

