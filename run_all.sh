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