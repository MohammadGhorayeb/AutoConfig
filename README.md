# AutoConfig - AI-Powered Configuration Assistant

AutoConfig is a sophisticated AI-powered system that combines multiple components to provide intelligent configuration assistance. The system integrates a Next.js frontend, NeMo Guardrails for content moderation, and a Llama-based language model for natural language processing.

## 🚀 Features

- **Modern Web Interface**: Built with Next.js 14, providing a responsive and user-friendly experience
- **Content Moderation**: Powered by NeMo Guardrails to ensure appropriate and safe responses
- **Language Model Integration**: Utilizes Llama 3.2 1B model for natural language understanding
- **Dockerized Deployment**: Easy setup and deployment using Docker Compose
- **Health Monitoring**: Built-in health checks for all services
- **Scalable Architecture**: Modular design allowing for easy extension and maintenance

## 🏗️ Architecture

The system consists of several interconnected services:

1. **UI Service** (`UI/`)
   - Next.js 14 frontend application
   - Handles user interactions and displays responses
   - Communicates with NeMo Guardrails service

2. **NeMo Guardrails Service** (`nemo_guardrails/`)
   - Content moderation and safety layer
   - Custom LLM integration
   - Configurable guardrails for response filtering

3. **Llama API Service** (`llama-api-docker/`)
   - Hosts the Llama 3.2 1B language model
   - Provides text generation capabilities
   - REST API interface for model access

4. **RAG Service** (`RAG/`)
   - Retrieval-Augmented Generation capabilities
   - Document processing and embedding
   - Enhanced response generation

## 🛠️ Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.10+ (for local development)
- Git
- Llama model files (see Quick Start section)

## 🚀 Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/AutoConfig.git
   cd AutoConfig
   ```

2. **Prepare Model Files**
   - Place your Llama model files in the following structure:
     ```
     llama-api-docker/
     └── models_new/
         └── Llama-3.2-1B_new/
             ├── model.safetensors
             ├── tokenizer.json
             ├── config.json
             └── tokenizer_config.json
     ```
   - The model files should be in the same format as the example files in the repository
   - Ensure all required model files are present before starting the services

3. Start the services:
   ```bash
   docker-compose up -d
   ```

4. Access the application:
   - UI: http://localhost:3001
   - NeMo Guardrails API: http://localhost:8080
   - Llama API: http://localhost:8000

## 🔧 Configuration

### Environment Variables

- `NEMO_API_URL`: URL for the NeMo Guardrails service (default: http://nemo-guardrails:8080)
- `LLAMA_API_URL`: URL for the Llama API service (default: http://llama-api:8000)
- `MONGODB_URI`: MongoDB connection string (default: mongodb://mongodb:27017/autoconfig)

### Service Configuration

Each service can be configured through its respective configuration files:

- NeMo Guardrails: `nemo_guardrails/config/`
- Llama API: `llama-api-docker/config/`
- RAG Service: `RAG/config/`

## 🧪 Development

### Local Development Setup

1. Install dependencies:
   ```bash
   # UI
   cd UI
   npm install

   # NeMo Guardrails
   cd ../nemo_guardrails
   pip install -r requirements.txt

   # Llama API
   cd ../llama-api-docker
   pip install -r requirements.txt
   ```

2. Start services individually:
   ```bash
   # UI
   cd UI
   npm run dev

   # NeMo Guardrails
   cd ../nemo_guardrails
   python api.py

   # Llama API
   cd ../llama-api-docker
   python api_server.py
   ```

## 📚 API Documentation

### NeMo Guardrails API

- **Endpoint**: `/chat`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "message": "Your message here",
    "max_tokens": 512,
    "temperature": 0.7
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "response": "Generated response"
  }
  ```

### Llama API

- **Endpoint**: `/generate`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "prompt": "Your prompt here",
    "max_tokens": 1024,
    "temperature": 0.7
  }
  ```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [NeMo Guardrails](https://github.com/NVIDIA/NeMo-Guardrails)
- [Next.js](https://nextjs.org/)