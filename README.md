# AutoConfig

A system for automated configuration using LLMs and RAG (Retrieval Augmented Generation).

## Components

- **UI**: Next.js frontend for interacting with the system
- **Llama API**: Service for LLM inference using Llama models
- **RAG Service**: Retrieval Augmented Generation service to enhance LLM responses with context
- **MongoDB**: Database for storing configurations and user data

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/AutoConfig.git
   cd AutoConfig
   ```

2. Create necessary environment files:
   ```bash
   cp .env.example .env
   ```

3. Download model files:
   You need to download the Llama 3.2 1B model and place it in `llama-api-docker/models_new/Llama-3.2-1B_new/` directory.

4. Start the services:
   ```bash
   docker-compose up -d
   ```

5. Access the UI:
   Open your browser and navigate to `http://localhost:3001`

## Development

### UI Development

The UI is built with Next.js and is configured for hot reloading. Any changes made to the UI code will be automatically reflected.

### RAG Service Development

The RAG service uses semantic search to enhance LLM responses. You can add documents to the `RAG/documents` directory to make them available for retrieval.

## Architecture

```
┌─────────┐     ┌───────────┐     ┌─────────────┐
│   UI    │────▶│ Llama API │     │ RAG Service │
│(Next.js)│     │           │◀───▶│             │
└─────────┘     └───────────┘     └─────────────┘
      │               │                   │
      │               │                   │
      └───────────────▼───────────────────┘
                      │
                 ┌─────────┐
                 │ MongoDB │
                 └─────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request