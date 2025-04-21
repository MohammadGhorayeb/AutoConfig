# RAG (Retrieval-Augmented Generation) System

This directory contains a Retrieval-Augmented Generation (RAG) system that enhances LLM responses with relevant document context.

## Overview

The RAG system consists of the following components:

- **Document Processor**: Processes documents into chunks suitable for retrieval
- **Embedding Model**: Creates vector embeddings for document chunks and queries
- **RAG System**: Coordinates the retrieval and augmentation process
- **RAG Server**: Exposes the RAG functionality through a REST API

## Directory Structure

```
RAG/
├── documents/        # Store your knowledge base documents here
├── embeddings/       # Stores generated embeddings and indices
├── utils/            # Utility modules
│   ├── embeddings.py         # Handles vector embeddings
│   └── document_processor.py # Processes documents into chunks
├── rag_system.py     # Core RAG implementation
├── rag_server.py     # FastAPI server exposing RAG functionality
└── requirements.txt  # Python dependencies
```

## Setup

1. Install the required dependencies:

```bash
pip install -r RAG/requirements.txt
```

2. Add documents to the `documents` directory.

3. Create the initial index:

```bash
python -m RAG.rag_server
```

Then make a POST request to `http://localhost:8001/rag/index`

## API Endpoints

The RAG server exposes the following endpoints:

- `GET /health` - Check server health and document count
- `POST /rag/query` - Process a query with RAG enhancement
- `POST /rag/index` - Create or recreate the RAG index
- `POST /rag/document` - Add a document to the index
- `GET /rag/documents` - List indexed documents

## Integration with LLaMA API

When a user query is processed, the RAG system:

1. Retrieves relevant document chunks based on semantic similarity
2. Constructs an augmented prompt with the retrieved context
3. Passes the augmented prompt to the LLaMA API for response generation

This enhances the model's responses with specific information from your knowledge base.

## Example Usage

```python
import requests

# Query with RAG enhancement
response = requests.post(
    "http://localhost:8001/rag/query",
    json={
        "query": "What is the process for employee onboarding?",
        "max_tokens": 1000,
        "temperature": 0.7,
        "rag_enabled": True
    }
)

# Use the augmented prompt with LLaMA API
llm_response = requests.post(
    "http://localhost:8000/generate",
    json={
        "prompt": response.json()["augmented_prompt"],
        "max_tokens": 1000,
        "temperature": 0.7
    }
)

print(llm_response.json()["response"])
``` 