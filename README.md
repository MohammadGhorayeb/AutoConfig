# AutoConfig
Get ready

# Create Docker network (ignore error if already exists)
docker network create llama-network || true

# Stop and remove existing containers (ignore errors if they don't exist)
docker rm -f llama-api inference-ui || true

# Build both images
docker build -t llama-api ./llama-api-docker
docker build -t inference-ui ./inference-ui

# Run both containers
docker run -d \
  --name llama-api \
  --network llama-network \
  -p 8000:8000 \
  -v $(pwd)/llama-api-docker/models:/app/models \
  llama-api

docker run -d \
  --name inference-ui \
  --network llama-network \
  -p 3000:3000 \
  inference-ui

# Show running containers
docker ps

# Show logs of both containers
echo "=== Llama API Logs ==="
docker logs llama-api
echo "=== Inference UI Logs ==="
docker logs inference-ui

chmod +x run_all.sh
./run_all.sh

# Llama Inference System

## Quick Start with Docker Compose

1. **Prerequisites**
   - Docker and Docker Compose installed
   - The Llama model file: `Llama-3.2-3B-Instruct-Q4_K_M.gguf`

2. **Setup**
   - Place the model file in: `llama-api-docker/models/`

3. **Run the System**
   ```bash
   # Build and start all services
   docker-compose up -d

   # View logs
   docker-compose logs -f

   # Stop services
   docker-compose down
   ```

4. **Rebuild (after changes)**
   ```bash
   docker-compose up -d --build
   ```

5. **Individual Container Management**
   ```bash
   # Start/stop specific service
   docker-compose up -d llama-api
   docker-compose up -d inference-ui

   # View specific logs
   docker-compose logs -f llama-api
   docker-compose logs -f inference-ui
   ```

## Accessing the Interface

1. **Web Interface**
   - URL: `http://localhost:3000`
   - Features:
     - Interactive text input
     - Temperature control (0-1)
     - Max tokens adjustment
     - Real-time response display

2. **API Testing with Postman**
   - Base URL: `http://localhost:8000`
   
   **Generate Text Endpoint:**
   - URL: `http://localhost:8000/generate`
   - Method: `POST`
   - Headers: 
     ```
     Content-Type: application/json
     ```
   - Request Body:
     ```json
     {
       "prompt": "Your text prompt here",
       "temperature": 0.7,
       "max_tokens": 100,
       "stop": ["Q:"]
     }
     ```

   **Model Info Endpoint:**
   - URL: `http://localhost:8000/model-info`
   - Method: `GET`
   - No body required

   Example curl command:
   ```bash
   curl -X POST http://localhost:8000/generate \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Tell me a short story",
       "temperature": 0.7,
       "max_tokens": 100,
       "stop": ["Q:"]
     }'
   ```