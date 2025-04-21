import os
import json
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

import sys
# Add the parent directory to sys.path to find the rag_system module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from rag_system import RAGSystem

# Initialize FastAPI app
app = FastAPI(title="RAG-Enabled LLaMA API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG system
rag = RAGSystem(
    documents_dir=os.path.join(os.path.dirname(__file__), "documents"),
    embeddings_dir=os.path.join(os.path.dirname(__file__), "embeddings"),
    embedding_model_name="all-MiniLM-L6-v2",
    chunk_size=512,
    chunk_overlap=128,
    top_k=3
)

# Define request models
class RAGQueryRequest(BaseModel):
    query: str
    max_tokens: int = 1000
    temperature: float = 0.7
    top_p: float = 0.9
    rag_enabled: bool = True

class DocumentUploadRequest(BaseModel):
    file_path: str
    
class RAGResponse(BaseModel):
    augmented_prompt: str
    context_documents: List[Dict[str, Any]]
    original_query: str

# Add simple health check route
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "rag_documents": len(rag.document_metadata),
        "rag_chunks": len(rag.document_chunks)
    }

@app.post("/rag/query")
async def rag_query(request: RAGQueryRequest):
    """
    Process a query using RAG to enhance with document context
    """
    if not request.query:
        raise HTTPException(status_code=400, detail="Query is required")
        
    try:
        if request.rag_enabled:
            # Use RAG to get context
            results = rag.retrieve(request.query)
            augmented_prompt = rag.generate_prompt(request.query, results)
            
            # Format context documents for the response
            context_docs = []
            for res in results:
                context_docs.append({
                    "document": res["document"],
                    "score": res["score"],
                    "snippet": res["chunk"][:200] + "..." if len(res["chunk"]) > 200 else res["chunk"]
                })
            
            return {
                "success": True,
                "augmented_prompt": augmented_prompt,
                "context_documents": context_docs,
                "original_query": request.query
            }
        else:
            # Just return the original query without augmentation
            return {
                "success": True,
                "augmented_prompt": request.query,
                "context_documents": [],
                "original_query": request.query
            }
    except Exception as e:
        print(f"Error processing RAG query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rag/index")
async def create_index():
    """
    Create or recreate the RAG index
    """
    try:
        rag.create_index()
        return {
            "success": True,
            "message": f"RAG index created with {len(rag.document_chunks)} chunks from {len(rag.document_metadata)} documents"
        }
    except Exception as e:
        print(f"Error creating RAG index: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rag/document")
async def add_document(request: DocumentUploadRequest):
    """
    Add a document to the RAG index
    """
    if not request.file_path:
        raise HTTPException(status_code=400, detail="File path is required")
        
    try:
        # Verify the file exists
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
            
        # Add document to the index
        success = rag.add_document(request.file_path)
        
        if success:
            return {
                "success": True,
                "message": f"Document added to RAG index: {os.path.basename(request.file_path)}"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add document to index")
    except Exception as e:
        print(f"Error adding document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rag/documents")
async def list_documents():
    """
    List all documents in the RAG index
    """
    try:
        documents = []
        for doc in rag.document_metadata:
            documents.append({
                "filename": doc["filename"],
                "path": doc["path"],
                "chunks": doc["num_chunks"]
            })
            
        return {
            "success": True,
            "documents": documents,
            "total": len(documents)
        }
    except Exception as e:
        print(f"Error listing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("Starting the RAG-enabled LLaMA API server...")
    port = int(os.getenv("RAG_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port) 