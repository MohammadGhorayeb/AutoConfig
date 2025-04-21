# NeMo Guardrails API Docker Container

This container provides a NeMo Guardrails API that adds safety rails to a LLM API. It's designed to work with a separately running LLM API container (e.g., llama-api).

## Prerequisites

1. Docker installed on your system
2. A running LLM API container (like llama-api)

## Quick Start

### 1. Create a Docker network

```bash
docker network create llm-net
```

### 2. Ensure your LLM API container is running on this network

```bash
# Example for a llama-api container
docker run -d --name llama-api \
  --network=llm-net \
  -p 8000:8000 \
  llama-api
```

### 3. Build the NeMo Guardrails container

```bash
# From the directory containing the Dockerfile
docker build -t nemo-guardrails .
```

### 4. Run the NeMo Guardrails container

```bash
docker run -d --name nemo-guardrails \
  --memory=4g \
  --network=llm-net \
  -p 8080:8080 \
  nemo-guardrails
```

## Configuration

### Environment Variables

You can configure the container using the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LLAMA_API_URL` | `http://llama-api:8000/generate` | URL of the LLM API endpoint |
| `NEMOGUARDRAILS_LOG_LEVEL` | `ERROR` | Logging level (ERROR, INFO, DEBUG) |
| `TIMEOUT` | `180` | Timeout in seconds for API calls |

Example with custom LLM API URL:

```bash
docker run -d --name nemo-guardrails \
  --memory=4g \
  --network=llm-net \
  -p 8080:8080 \
  -e LLAMA_API_URL=http://my-custom-llm:9000/generate \
  nemo-guardrails
```

## Using the API

### Health Check

```bash
curl http://localhost:8080/health
```

### Diagnostics

For detailed diagnostics about the container:

```bash
curl http://localhost:8080/diagnostics
```

### Chat Endpoint

```bash
curl -X POST http://localhost:8080/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about artificial intelligence"}'
```

## Troubleshooting

### Container doesn't start or becomes unhealthy

Check the logs:

```bash
docker logs nemo-guardrails
```

### Can't connect to LLM API

Make sure:
1. Both containers are on the same Docker network
2. The LLM API container is running
3. The LLM API URL is correct

You can check connectivity with:

```bash
docker exec nemo-guardrails ping llama-api
```

### API returns errors

Check the diagnostics endpoint for detailed information:

```bash
curl http://localhost:8080/diagnostics
``` 