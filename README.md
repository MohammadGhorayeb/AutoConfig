# AutoConfig with RAG-Enhanced LLM

This project provides an employee chat interface powered by Llama 3.2-1B and enhanced with RAG (Retrieval-Augmented Generation) capabilities.

## System Components

1. **LLaMA API Server**: Provides the LLM interface (port 8000)
2. **RAG Service**: Enhances the LLM with document retrieval (port 8001)  
3. **UI**: React-based user interface for employee chat (port 3001)
4. **MongoDB**: Database for storing conversations and user data (port 27018)

## Getting Started

### Prerequisites

- Docker and Docker Compose
- At least 4GB of RAM for the LLaMA model
- The LLaMA 3.2-1B model files in the `llama-api-docker/models/Llama-3.2-1B` directory

### Setup Documents for RAG

1. Add your document files to the `llama-api-docker/RAG/documents` directory
2. Process them with the memory-efficient RAG builder:

```bash
cd llama-api-docker/RAG
python run_tiny_rag.py
```

This creates embeddings in the `llama-api-docker/RAG/embeddings` directory.

### Running the System with Docker

Start the entire system with Docker Compose:

```bash
docker-compose up --build
```

This will:
- Build and start all services
- Mount the necessary volumes for models and RAG data
- Connect all the services together

### Services

| Service | URL | Description |
|---------|-----|-------------|
| UI | http://localhost:3001 | Employee chat interface |
| LLaMA API | http://localhost:8000 | LLM inference API |
| RAG service | http://localhost:8001 | Document retrieval API |
| MongoDB | localhost:27018 | Database |

## Using the System

1. Open the UI at http://localhost:3001
2. Log in with your credentials
3. Start chatting with the AI assistant
4. For questions about company documents, the RAG system will automatically enhance the responses with relevant information

## API Endpoints

### LLaMA API (8000)

- `GET /health`: Health check
- `POST /generate`: Generate text from a prompt
- `GET /model-info`: Get model information

### RAG API (8001)

- `GET /health`: Health check
- `POST /rag/query`: Query with RAG enhancement
- `GET /rag/documents`: List available documents

## Troubleshooting

### Memory Issues

If you experience memory issues with the RAG system:

1. Use the memory-efficient processing:
   ```
   cd llama-api-docker/RAG
   python process_single_document.py documents/problematic_file.txt --chunk-size 64 --chunk-overlap 16
   ```

2. For overall RAG processing:
   ```
   cd llama-api-docker/RAG
   python run_tiny_rag.py
   ```

### Container Issues

- Check container logs: `docker-compose logs <service-name>`
- Restart a specific service: `docker-compose restart <service-name>`
- Rebuild a service: `docker-compose up --build <service-name>`

## Running Without Docker

To run the system without Docker:

1. Start MongoDB (install locally or use Docker for just this component)
2. Run the LLaMA API server:
   ```
   cd llama-api-docker
   python api_server.py
   ```
3. Run the RAG server:
   ```
   cd llama-api-docker/RAG
   python light_rag.py
   ```
4. Run the UI:
   ```
   cd UI
   npm install
   npm run dev
   ```