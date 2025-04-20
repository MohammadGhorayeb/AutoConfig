import logging
import os
from typing import Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from nemoguardrails import LLMRails, RailsConfig
from custom_llm import CustomLLM

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the LLM
custom_llm = CustomLLM(
    llama_api_url=os.environ.get("LLAMA_API_URL", "http://llama-api:8000")
)

# Load configuration
config = RailsConfig.from_path("./config")
guardrails = LLMRails(config, llm=custom_llm)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = None

@app.get("/health")
async def health():
    """Health check endpoint."""
    logger.info("Health check requested")
    return {"status": "ok"}

@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat endpoint that processes the request through NeMo Guardrails."""
    logger.info(f"Chat request received: {request.message}")
    
    try:
        # Format the conversation history if provided
        messages = []
        if request.history:
            for msg in request.history:
                messages.append({"role": msg.role, "content": msg.content})
        
        # Add the new user message
        messages.append({"role": "user", "content": request.message})
        
        # Get response from guardrails
        logger.info(f"Sending to guardrails: {messages}")
        # Disable streaming for now
        response = guardrails.generate_response(messages=messages, streaming=False)
        logger.info(f"Response from guardrails: {response}")
        
        return {"response": response}
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080) 