from fastapi.testclient import TestClient
from app.main import app
import os
import pytest
import shutil

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "ImageGraph Backend is running"}

def test_scan_folder_invalid():
    response = client.post("/scan", json={"path": "/invalid/path/that/does/not/exist"})
    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid directory path"}

def test_scan_folder_valid(tmp_path):
    # Create a temporary directory for testing
    test_dir = tmp_path / "images"
    test_dir.mkdir()
    
    # Create a dummy image file
    (test_dir / "test.jpg").touch()
    
    response = client.post("/scan", json={"path": str(test_dir)})
    assert response.status_code == 200
    assert response.json()["status"] == "Scan started"
    assert response.json()["path"] == str(test_dir)

from app.db.storage import db
import json

def test_get_graph():
    # Inject dummy data to trigger graph building logic
    db.add_image(
        path="/tmp/test_image.jpg",
        thumbnail_path="",
        caption="A test image",
        ocr_text="text",
        embedding=[0.1]*512,
        tags=["test", "concept"]
    )
    
    response = client.get("/graph")
    assert response.status_code == 200
    assert "elements" in response.json()
    assert len(response.json()["elements"]) > 0
