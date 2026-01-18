import networkx as nx
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from app.db.storage import db
import json
import os

class GraphBuilder:
    def __init__(self, sim_threshold=0.7, min_confidence=0.5):
        self.sim_threshold = sim_threshold
        self.min_confidence = min_confidence

    def build_graph(self):
        images = db.get_all_images() # [(id, path, caption, tags_json), ...]
        ids, embeddings = db.get_all_embeddings()
        
        G = nx.Graph()
        
        # 1. Add Image Nodes
        # Map DB ID to Node ID (e.g., "img_1")
        img_id_map = {}
        
        for img in images:
            iid, path, caption, tags_json = img
            node_id = f"img_{iid}"
            img_id_map[iid] = node_id
            
            tags = json.loads(tags_json) if tags_json else []
            
            G.add_node(node_id, 
                       labels=["Image"], 
                       type="image",
                       path=path,
                       caption=caption,
                       name=os.path.basename(path))
            
            # 2. Add Concept Nodes & Edges (Image -> Concept)
            for tag in tags:
                # Normalize tag
                concept = tag.lower().strip()
                if len(concept) < 2: continue
                
                concept_id = f"con_{concept}"
                 
                if not G.has_node(concept_id):
                    G.add_node(concept_id, labels=["Concept"], type="concept", name=concept)
                
                # Edge: Image -> Concept
                # Check if edge exists to increment weight? Usually binary here, but we can play.
                G.add_edge(node_id, concept_id, type="has_concept", weight=1.0)

        # 3. Add Concept -> Concept Edges (Co-occurrence)
        # Iterate over images, get all concepts, form clique
        for img in images:
            tags = json.loads(img[3]) if img[3] else []
            concepts = [f"con_{t.lower().strip()}" for t in tags if len(t.lower().strip()) >= 2]
            
            for i in range(len(concepts)):
                for j in range(i + 1, len(concepts)):
                    u, v = concepts[i], concepts[j]
                    if G.has_edge(u, v):
                        G[u][v]['weight'] += 1
                    else:
                        G.add_edge(u, v, type="co_occurrence", weight=1)

        # 4. Add Image -> Image Edges (Similarity)
        if len(embeddings) > 1:
            sim_matrix = cosine_similarity(embeddings)
            # embeddings order matches `ids` list
            for i in range(len(ids)):
                for j in range(i + 1, len(ids)):
                    if sim_matrix[i][j] >= self.sim_threshold:
                        img_node_a = img_id_map.get(ids[i])
                        img_node_b = img_id_map.get(ids[j])
                        if img_node_a and img_node_b:
                            G.add_edge(img_node_a, img_node_b, 
                                       type="similar", 
                                       weight=float(sim_matrix[i][j]))

        return G

    def export_cytoscape(self):
        G = self.build_graph()
        elements = []
        
        for node, data in G.nodes(data=True):
            elements.append({
                "data": {"id": node, **data}
            })
            
        for u, v, data in G.edges(data=True):
            elements.append({
                "data": {"source": u, "target": v, **data}
            })
            
        return elements

graph_builder = GraphBuilder()
