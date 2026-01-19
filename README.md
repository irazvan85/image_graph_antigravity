# ImageGraph

ImageGraph is a powerful tool for analyzing your local photo collections and turning them into an interactive, searchable knowledge graph. It uses modern AI (BLIP, CLIP, EasyOCR, and optionally Gemini) to understand the content of your images, extracting captions, text, and semantic relationships.

## Features

- **Interactive Knowledge Graph**: View relationships between images and concepts (tags, OCR text).
- **AI-Powered Analysis**:
    - **Captioning**: Automatic description of images using BLIP.
    - **Text Extraction**: OCR processing with EasyOCR.
    - **Deep Analysis**: Optional integration with Gemini 1.5 Flash for expert-level insights.
- **Real-Time Graph Search**: Search through thousands of images and tags with instant highlighting and zooming.
- **Similarity Mapping**: Automatically connects semantically similar images using CLIP embeddings.
- **Fast & Responsive**: Lazy-loaded AI models ensure quick startup.

## Prerequisites

- **Python 3.9+**
- **Node.js 18+**
- **npm**
- (Optional) **Gemini API Key** for Deep Analysis.

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/irazvan85/image_graph_antigravity.git
cd image_graph_antigravity
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

## Running the Application

For full functionality, both the backend and frontend must be running.

### 1. Start the Backend
From the `backend` directory:
```bash
uvicorn app.main:app --reload --port 8001
```
The API will be available at `http://localhost:8001`.

### 2. Start the Frontend
From the `frontend` directory:
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.

## Usage

1.  Open `http://localhost:5173` in your browser.
2.  Enter the **Folder Path** of your images (e.g., `C:/MyPhotos`).
3.  (Optional) Toggle **Deep LLM Analysis** and enter your Gemini API Key.
4.  Click **Play** to start the scan.
5.  Watch as the Knowledge Graph builds in real-time!
6.  Use the **Search bar** to find specific tags or images.

## Deployment (Ansible)

A Windows-ready Ansible playbook is available in the `ansible/` directory. It uses Chocolatey and NSSM to set up ImageGraph as persistent Windows Services.

See `ansible/deploy_windows.yml` and the walkthrough in the brain documentation for details.

## License
MIT
