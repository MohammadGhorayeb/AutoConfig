FROM python:3.10-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    LLAMA_API_URL=http://llama-api:8000 \
    NEMOGUARDRAILS_LOG_LEVEL=INFO \
    TIMEOUT=120 \
    PATH="/home/app/.local/bin:${PATH}"

# Install build dependencies and debugging tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    curl \
    iputils-ping \
    netcat-openbsd \
    dnsutils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN adduser --disabled-password --gecos "" app
RUN mkdir -p /app/config && chown -R app:app /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel
RUN pip install --timeout=600 --no-cache-dir --index-url https://pypi.org/simple/ -r requirements.txt

# Copy the application code
COPY . .

# Add a healthcheck
HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Expose the port the app will run on
EXPOSE 8080

# Create start script
RUN echo '#!/bin/bash\necho "Starting NeMo Guardrails server..."\nexec python -u api.py' > /app/start.sh
RUN chmod +x /app/start.sh

# Command to run the application
CMD ["/app/start.sh"] 