FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install only necessary system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy RAG requirements first
COPY RAG/requirements.txt ./rag_requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r rag_requirements.txt

# Create necessary directories
RUN mkdir -p /app/models /app/RAG/embeddings /app/RAG/documents /app/RAG/model_cache

# Copy the RAG system files
COPY RAG/ /app/RAG/

# Copy API server and start script
COPY llama-api-docker/api_server.py ./
COPY llama-api-docker/start_api.sh ./
RUN chmod +x start_api.sh

# Environment variables
ENV MODEL_DIR=/app/models/Llama-3.2-1B_new
ENV PYTHONPATH=/app
ENV RUN_RAG_SERVER=true

# Expose ports
EXPOSE 8000 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

# Command to run the application
CMD ["python", "/app/RAG/light_rag.py"]