import sqlite3
import json
import numpy as np
import os
from datetime import datetime

# Get the directory of the current file (backend/app/db)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Navigate up to the backend directory (backend/)
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
DB_PATH = os.path.join(backend_dir, "db.sqlite")


class Storage:
    def __init__(self):
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.create_tables()

    def create_tables(self):
        cursor = self.conn.cursor()
        
        # Items table (previously images)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE,
                type TEXT DEFAULT 'image',
                thumbnail_path TEXT,
                caption TEXT,
                ocr_text TEXT,
                tags TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Add type column if it doesn't exist (migration)
        try:
            cursor.execute('ALTER TABLE images ADD COLUMN type TEXT DEFAULT "image"')
        except sqlite3.OperationalError:
            pass # Already exists
        
        # Concepts/Tags table (for graph nodes)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS concepts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                type TEXT
            )
        ''')
        
        # Edges? Or we construct graph on fly from embeddings + co-occurrence.
        # Let's store embeddings separately or as blob
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS embeddings (
                image_id INTEGER,
                vector BLOB,
                FOREIGN KEY(image_id) REFERENCES images(id)
            )
        ''')
        
        self.conn.commit()

    def add_image(self, path, type, thumbnail_path, caption, ocr_text, embedding, tags):
        cursor = self.conn.cursor()
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO images (path, type, thumbnail_path, caption, ocr_text, tags)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (path, type, thumbnail_path, caption, ocr_text, json.dumps(tags)))
            
            # Get ID (if ignored, we need to fetch it)
            if cursor.lastrowid:
                img_id = cursor.lastrowid
            else:
                cursor.execute('SELECT id FROM images WHERE path = ?', (path,))
                result = cursor.fetchone()
                if result:
                    img_id = result[0]
                else:
                    return None # Should not happen

            # Store embedding
            vector_blob = np.array(embedding, dtype=np.float32).tobytes()
            # Check if embedding exists
            cursor.execute('DELETE FROM embeddings WHERE image_id = ?', (img_id,))
            cursor.execute('INSERT INTO embeddings (image_id, vector) VALUES (?, ?)', (img_id, vector_blob))
            
            self.conn.commit()
            return img_id
        except Exception as e:
            print(f"DB Error: {e}")
            return None

    def get_all_images(self):
        cursor = self.conn.cursor()
        cursor.execute('SELECT id, path, caption, tags, type FROM images')
        return cursor.fetchall()
    
    def get_all_embeddings(self):
        cursor = self.conn.cursor()
        cursor.execute('SELECT image_id, vector FROM embeddings')
        rows = cursor.fetchall()
        ids = []
        vecs = []
        for r in rows:
            ids.append(r[0])
            vecs.append(np.frombuffer(r[1], dtype=np.float32))
        return ids, np.array(vecs) if vecs else np.empty((0, 512)) # CLIP is 512d

    def clear_database(self):
        cursor = self.conn.cursor()
        cursor.execute('DELETE FROM embeddings')
        cursor.execute('DELETE FROM concepts')
        cursor.execute('DELETE FROM images')
        self.conn.commit()

db = Storage()
