FROM python:3.10-slim

WORKDIR /app

# Set environment variables - these can be overridden when running the container
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    # Default llama-api URL - assumes Docker network "llm-net" with "llama-api" container running
    LLAMA_API_URL=http://llama-api:8000/generate \
    # Can be set to INFO, DEBUG, ERROR, etc.
    NEMOGUARDRAILS_LOG_LEVEL=ERROR \
    TIMEOUT=180 \
    # Use local cache for models
    TRANSFORMERS_CACHE=/home/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/home/app/.cache/torch/sentence_transformers \
    # Increase pip timeout
    PIP_DEFAULT_TIMEOUT=300

# Install build dependencies and debugging tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    curl \
    iputils-ping \
    netcat-openbsd \
    dnsutils \
    procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN adduser --disabled-password --gecos "" app
RUN mkdir -p /app/config && chown -R app:app /app

# Copy requirements first for better caching
COPY requirements.txt .

# Create a pip.conf file with timeout and retries
RUN echo "[global]\ntimeout = 300\nretries = 5\n" > /etc/pip.conf

RUN pip install --upgrade pip setuptools wheel

# First install core dependencies with retries
RUN pip install --no-cache-dir --retries 10 fastapi uvicorn psutil requests nest_asyncio

# Create our own simpler api.py that doesn't use nemoguardrails
COPY . .

# Create script to dynamically generate simple API when nemoguardrails fails
RUN echo '#!/bin/bash\n\
if [ -f /tmp/pip_failed ]; then\n\
  echo "Creating simplified API without NeMo Guardrails..."\n\
  cat > /app/api.py << EOF\n\
import logging\n\
import os\n\
import uvicorn\n\
import requests\n\
from fastapi import FastAPI, HTTPException\n\
from fastapi.middleware.cors import CORSMiddleware\n\
from pydantic import BaseModel\n\
from typing import List, Optional\n\
\n\
app = FastAPI(title="Simplified LLM API")\n\
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])\n\
\n\
LLAMA_API_URL = os.environ.get("LLAMA_API_URL", "http://llama-api:8000/generate")\n\
if not LLAMA_API_URL.endswith("/generate"):\n\
    LLAMA_API_URL += "/generate"\n\
\n\
class Message(BaseModel):\n\
    role: str\n\
    content: str\n\
\n\
class ChatRequest(BaseModel):\n\
    message: str\n\
    history: Optional[List[Message]] = None\n\
\n\
class ChatResponse(BaseModel):\n\
    response: str\n\
\n\
@app.get("/health")\n\
async def health():\n\
    return {"status": "ok"}\n\
\n\
@app.post("/chat")\n\
async def chat(request: ChatRequest):\n\
    try:\n\
        payload = {"prompt": request.message, "max_tokens": 512, "temperature": 0.7}\n\
        response = requests.post(LLAMA_API_URL, json=payload, timeout=60)\n\
        response.raise_for_status()\n\
        data = response.json()\n\
        if isinstance(data, dict) and "text" in data:\n\
            return {"response": data["text"]}\n\
        return {"response": str(data)}\n\
    except Exception as e:\n\
        raise HTTPException(status_code=500, detail=str(e))\n\
\n\
if __name__ == "__main__":\n\
    print(f"Starting simplified API on port 8080...")\n\
    uvicorn.run(app, host="0.0.0.0", port=8080)\n\
EOF\n\
  echo "Simplified API created successfully."\n\
fi\n' > /app/create_simple_api.sh
RUN chmod +x /app/create_simple_api.sh

# Then try to install nemoguardrails, but continue if it fails
RUN pip install --no-cache-dir --retries 10 nemoguardrails>=0.5.0,\<0.6.0 || touch /tmp/pip_failed

# Set up cache directories that will be accessible by the app user
RUN mkdir -p /home/app/.cache/torch/sentence_transformers
RUN mkdir -p /home/app/.cache/huggingface
RUN chown -R app:app /home/app/.cache

# Install and download the model as the app user
USER app
# Explicitly install sentence-transformers first
RUN pip install --user --retries 10 sentence-transformers>=2.2.0 || echo "Failed to install sentence-transformers"
# Then try to download the model
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" || echo "Failed to download model, will download at runtime"
USER root

# Ensure directory permissions are correct
RUN chown -R app:app /app

# Add a healthcheck with longer timeout (90s)
HEALTHCHECK --interval=30s --timeout=90s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Expose the port the app will run on
EXPOSE 8080

# Create a robust startup script that works with or without nemoguardrails
RUN echo '#!/bin/bash\n\
\n\
echo "========================================================="\n\
echo "  NeMo Guardrails API - Starting Up                      "\n\
echo "========================================================="\n\
echo "API URL set to: $LLAMA_API_URL"\n\
\n\
# Check if we need to create simple API
/app/create_simple_api.sh\n\
\n\
# Test connectivity to llama-api\n\
echo "Testing connectivity to llama-api..."\n\
LLAMA_HOST=$(echo $LLAMA_API_URL | sed -E "s/https?:\\/\\///g" | cut -d":" -f1)\n\
if ping -c 1 $LLAMA_HOST > /dev/null 2>&1; then\n\
  echo "✅ llama-api is reachable"\n\
else\n\
  echo "⚠️  WARNING: Cannot reach llama-api ($LLAMA_HOST). Make sure:"\n\
  echo "   1. Your llama-api container is running"\n\
  echo "   2. Both containers are on the same Docker network (e.g., --network=llm-net)"\n\
  echo "   3. The llama-api container is named correctly or LLAMA_API_URL is set correctly"\n\
  echo "\n\
  Current LLAMA_API_URL: $LLAMA_API_URL\n\
  \n\
  Continuing startup anyway..."\n\
fi\n\
\n\
echo "========================================================="\n\
echo "Starting API server on port 8080..."\n\
echo "Health check will be available at: http://localhost:8080/health"\n\
echo "========================================================="\n\
exec python -u api.py\n' > /app/start.sh

RUN chmod +x /app/start.sh

# Set user for running the application
USER app

# Command to run the application
CMD ["/app/start.sh"] 