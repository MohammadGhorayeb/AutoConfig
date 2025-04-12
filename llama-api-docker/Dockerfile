# Use Python 3.10 slim image as base
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install build tools, cmake, and git
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
 && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY api_server.py .

# Create models directory
RUN mkdir -p models

# Environment variable for model path
ENV MODEL_PATH=/app/models/Llama-3.2-3B-Instruct-Q4_K_M.gguf

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["python", "api_server.py"]