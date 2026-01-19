import os
import threading
import time
from app.core.analyzer import analyzer
from app.db.storage import db
import queue

class ScanWorker:
    def __init__(self):
        self.queue = queue.Queue()
        self.status = "idle"
        self.total_files = 0
        self.processed_files = 0
        self.current_file = ""
        self.logs = []
        self._stop_event = threading.Event()
        self.thread = None

    def log(self, message):
        timestamp = time.strftime("%H:%M:%S")
        self.logs.append(f"[{timestamp}] {message}")
        if len(self.logs) > 50:
            self.logs.pop(0)

    def start_scan(self, folder_path, use_llm=False, api_key=""):
        if self.status == "scanning":
            return False
        
        self.status = "scanning"
        self.total_files = 0
        self.processed_files = 0
        self.logs = []
        self._stop_event.clear()
        self.use_llm = use_llm
        self.api_key = api_key
        
        self.log(f"Starting scan of {folder_path}...")
        
        # Enqueue files
        valid_exts = ('.jpg', '.jpeg', '.png', '.webp', '.txt')
        files = []
        for root, _, filenames in os.walk(folder_path):
            for f in filenames:
                if f.lower().endswith(valid_exts):
                    files.append(os.path.join(root, f))
        
        self.total_files = len(files)
        self.log(f"Found {self.total_files} files.")
        
        for f in files:
            self.queue.put(f)
            
        self.thread = threading.Thread(target=self._process_queue)
        self.thread.start()
        return True

    def _process_queue(self):
        while not self.queue.empty() and not self._stop_event.is_set():
            file_path = self.queue.get()
            self.current_file = file_path
            
            ext = os.path.splitext(file_path)[1].lower()
            item_type = "text" if ext == ".txt" else "image"
            fname = os.path.basename(file_path)

            try:
                # Analyze
                result = analyzer.analyze(file_path, self.use_llm, self.api_key)
                if result:
                    # Check if it's an error from LLM
                    if "error" in result:
                        err_reason = result["error"]
                        self.log(f"LLM Failed for {fname}: {err_reason}. Falling back to local...")
                        # Run local fallback manually here to get actual content
                        result = analyzer.analyze(file_path, use_llm=False)
                        if not result:
                            self.log(f"Fallback also failed for {fname}")
                            continue

                    metadata = result.get("metadata", {})
                    method = metadata.get("method", "Unknown")
                    duration = metadata.get("duration", 0)
                    
                    self.log(f"{method}: Analyzed {fname} in {duration:.1f}s")
                    
                    # If LLM/Analysis gave us tags, use them.
                    if 'tags' in result and result['tags']:
                        tags = result['tags']
                    else:
                        caption_graph = result.get('caption', "").lower().split()
                        ocr_graph = result.get('ocr_text', "").lower().split()
                        
                        # Basic stop word removal (very basic)
                        stop_words = {'the', 'and', 'this', 'that', 'with', 'from', 'image', 'picture', 'photo'}
                        tags = list(set([w.strip(".,") for w in caption_graph + ocr_graph if len(w) > 3 and w not in stop_words]))
                    
                    db.add_image(
                        path=file_path,
                        type=item_type,
                        thumbnail_path="", 
                        caption=result.get('caption', ""),
                        ocr_text=result.get('ocr_text', "") if item_type == "image" else result.get('content', ""),
                        embedding=result['embedding'],
                        tags=tags
                    )
                    self.log(f"Saved {fname} to graph.")
            except Exception as e:
                self.log(f"Error processing {fname}: {e}")
            
            self.processed_files += 1
            self.queue.task_done()
            
        self.status = "idle"
        self.current_file = ""
        self.log("Scan complete.")

    def get_progress(self):
        return {
            "status": self.status,
            "total": self.total_files,
            "processed": self.processed_files,
            "current": os.path.basename(self.current_file) if self.current_file else "",
            "logs": self.logs
        }

worker = ScanWorker()
