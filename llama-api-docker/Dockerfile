# Use a more recent PyTorch image
FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

# Set working directory
WORKDIR /app

# Install build tools, cmake, git and curl for health checks
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install additional Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install RAG requirements
COPY RAG/requirements.txt ./rag_requirements.txt
RUN pip install --no-cache-dir -r rag_requirements.txt

# Copy the application code
COPY api_server.py .
COPY downloading_model.py .
COPY run_locally.py .
COPY start_api.sh .
RUN chmod +x start_api.sh

# Create model directory
RUN mkdir -p /app/models

# Copy the RAG system
COPY RAG/ /app/RAG/

# Environment variable for model path
ENV MODEL_DIR=/app/models/Llama-3.2-1B
ENV PYTHONPATH=/app

# Expose the ports
EXPOSE 8000
EXPOSE 8001

# Command to run the application
CMD ["./start_api.sh"]