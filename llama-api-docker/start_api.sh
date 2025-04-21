#!/bin/bash

# Check if model exists
MODEL_DIR=${MODEL_DIR:-"/app/models/Llama-3.2-1B"}

echo "Checking for model in: $MODEL_DIR"

if [ ! -d "$MODEL_DIR" ]; then
  echo "Warning: Model directory $MODEL_DIR does not exist"
  echo "You need to mount the model directory as a volume when running the container"
  echo "Example: docker run -v /local/path/to/models:/app/models -p 8000:8000 -p 8001:8001 llama-api"
  exit 1
fi

# Create RAG directories if they don't exist
mkdir -p /app/RAG/embeddings
mkdir -p /app/RAG/documents

# Check if we need to run the RAG server
if [ "$RUN_RAG_SERVER" = "true" ]; then
  echo "Starting RAG server on port 8001"
  python /app/RAG/light_rag.py &
  RAG_PID=$!
  echo "RAG server started with PID: $RAG_PID"
else
  echo "RAG server not requested, skipping"
fi

# Launch the API server
echo "Starting API server with model from $MODEL_DIR"
python api_server.py 