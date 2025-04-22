"""
Lightweight RAG server that uses less memory
"""
import os
import json
import glob
import logging
import traceback
import numpy as np
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
from sentence_transformers import SentenceTransformer

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("light_rag.log"), logging.StreamHandler()]
)
logger = logging.getLogger("LightRAG")

# Initialize FastAPI app
app = FastAPI(title="Light RAG API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get current directory
current_dir = os.path.dirname(os.path.abspath(__file__))
DOCUMENTS_DIR = os.path.join(current_dir, "documents")
EMBEDDINGS_DIR = os.path.join(current_dir, "embeddings")
EMBEDDING_MODEL = None
DOCUMENT_INDEX = {}
DOCUMENT_CHUNKS = []
CHUNK_EMBEDDINGS = None

# Define request/response models
class QueryRequest(BaseModel):
    query: str
    top_k: int = 3

class QueryResponse(BaseModel):
    success: bool
    augmented_prompt: str
    context_documents: List[Dict[str, Any]] = []

def chunk_text(text, chunk_size=512, chunk_overlap=128):
    """Split text into overlapping chunks"""
    chunks = []
    if len(text) <= chunk_size:
        return [text]
    
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - chunk_overlap
    
    return chunks

def load_embeddings():
    """Load embeddings and index if they exist"""
    global DOCUMENT_INDEX, DOCUMENT_CHUNKS, CHUNK_EMBEDDINGS, EMBEDDING_MODEL
    
    try:
        # Create embedding model
        if EMBEDDING_MODEL is None:
            logger.info("Loading embedding model")
            cache_dir = os.path.join(current_dir, "model_cache")
            os.makedirs(cache_dir, exist_ok=True)
            EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2', cache_folder=cache_dir)
        
        # Load index if it exists
        index_path = os.path.join(EMBEDDINGS_DIR, "rag_index.json")
        embeddings_path = os.path.join(EMBEDDINGS_DIR, "chunk_embeddings.npy")
        
        if os.path.exists(index_path) and os.path.exists(embeddings_path):
            logger.info("Loading existing RAG index")
            
            with open(index_path, 'r') as f:
                index_data = json.load(f)
            
            # Load document chunks
            DOCUMENT_CHUNKS = []
            for doc_meta in index_data["metadata"]:
                with open(doc_meta["path"], 'r', encoding='utf-8') as f:
                    content = f.read()
                chunks = chunk_text(content)
                DOCUMENT_CHUNKS.extend(chunks)
            
            # Load document index
            DOCUMENT_INDEX = {int(k): v for k, v in index_data["document_index"].items()}
            
            # Load embeddings
            CHUNK_EMBEDDINGS = np.load(embeddings_path)
            
            logger.info(f"Loaded {len(DOCUMENT_CHUNKS)} chunks and {CHUNK_EMBEDDINGS.shape[0]} embeddings")
            return True
        else:
            logger.error("RAG index not found. Please run the diagnose_embedding.py script first.")
            return False
    
    except Exception as e:
        logger.error(f"Error loading embeddings: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def find_similar_chunks(query, top_k=3):
    """Find chunks similar to the query"""
    if CHUNK_EMBEDDINGS is None or not DOCUMENT_CHUNKS:
        return []
    
    query_embedding = EMBEDDING_MODEL.encode([query])[0]
    
    # Calculate similarities (dot product)
    similarities = np.dot(CHUNK_EMBEDDINGS, query_embedding)
    
    # Get top k indices
    top_indices = np.argsort(similarities)[-top_k:][::-1]
    
    results = []
    for idx in top_indices:
        if idx < len(DOCUMENT_CHUNKS):
            chunk_text = DOCUMENT_CHUNKS[idx]
            doc_info = DOCUMENT_INDEX.get(idx, {"doc_idx": 0})
            
            results.append({
                "chunk": chunk_text,
                "score": float(similarities[idx]),
                "document": f"Document {doc_info['doc_idx']}"
            })
    
    return results

def generate_prompt(query, results):
    """Generate a simple prompt with retrieved context"""
    prompt = "Answer based on this information:\n\n"
    
    for i, result in enumerate(results):
        prompt += f"[{i+1}] {result['chunk']}\n\n"
    
    prompt += f"Question: {query}\n\nAnswer:"
    
    return prompt

@app.on_event("startup")
def startup_event():
    """Load embeddings on startup"""
    os.makedirs(EMBEDDINGS_DIR, exist_ok=True)
    load_embeddings()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    chunks_loaded = len(DOCUMENT_CHUNKS) > 0
    embeddings_loaded = CHUNK_EMBEDDINGS is not None
    model_loaded = EMBEDDING_MODEL is not None
    
    return {
        "status": "ok" if chunks_loaded and embeddings_loaded and model_loaded else "not_ready",
        "chunks_loaded": chunks_loaded,
        "embeddings_loaded": embeddings_loaded,
        "model_loaded": model_loaded,
        "num_chunks": len(DOCUMENT_CHUNKS) if chunks_loaded else 0
    }

@app.post("/rag/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """Process a query with RAG"""
    if CHUNK_EMBEDDINGS is None or not DOCUMENT_CHUNKS:
        if not load_embeddings():
            return {
                "success": False,
                "augmented_prompt": request.query,
                "context_documents": []
            }
    
    try:
        # Get similar chunks
        results = find_similar_chunks(request.query, request.top_k)
        
        # Format results for response
        context_docs = []
        for res in results:
            context_docs.append({
                "document": res["document"],
                "score": res["score"],
                "snippet": res["chunk"][:200] + "..." if len(res["chunk"]) > 200 else res["chunk"]
            })
        
        # Generate augmented prompt
        augmented_prompt = generate_prompt(request.query, results)
        
        return {
            "success": True,
            "augmented_prompt": augmented_prompt,
            "context_documents": context_docs
        }
    
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "augmented_prompt": request.query,
            "context_documents": []
        }

if __name__ == "__main__":
    # Run the server
    port = int(os.getenv("RAG_PORT", 8001))
    print(f"Starting lightweight RAG server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port) 