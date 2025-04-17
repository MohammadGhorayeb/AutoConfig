# Use Python 3.10 slim image as base
FROM python:3.10-slim

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

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY api_server.py .
COPY start_api.sh .
RUN chmod +x start_api.sh

# Copy the model files (this will make the image large)
COPY models_new/ /app/models_new/

# Environment variable for model path
ENV MODEL_DIR=/app/models_new/Llama-3.2-1B_new

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["./start_api.sh"]