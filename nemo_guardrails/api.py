import logging
import os
import sys
import json
from typing import Dict, List, Optional
import datetime

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import nest_asyncio

# Apply nest_asyncio to allow sync code in async context
nest_asyncio.apply()

# Configure logging
logging.basicConfig(level=logging.ERROR)

# Import NemoGuardrails components
from nemoguardrails import RailsConfig
from nemoguardrails import LLMRails
from custom_llm import CustomLLM

# Initialize FastAPI app
app = FastAPI(title="NeMo Guardrails API", description="API for accessing LLM with guardrails")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get LLAMA API URL from environment with fallback
LLAMA_API_URL = os.environ.get("LLAMA_API_URL", "http://localhost:8000/generate")
# Ensure URL ends with /generate
if not LLAMA_API_URL.endswith("/generate"):
    LLAMA_API_URL += "/generate"

# Initialize the guardrails components
try:
    print(f"Initializing CustomLLM with API URL: {LLAMA_API_URL}")
    llm = CustomLLM(api_url=LLAMA_API_URL)
    
    # Load the config quietly with proper path handling
    try:
        config = RailsConfig.from_path("./config")
    except Exception as e:
        print(f"Error loading config from ./config: {e}")
        config = RailsConfig.from_path("./nemo_guardrails/config")
        
    # Create the rails with the custom LLM
    print("Creating LLMRails instance...")
    rails = LLMRails(config, llm=llm)
    print("Guardrails initialized successfully")
except Exception as e:
    print(f"ERROR initializing guardrails: {e}")
    import traceback
    print(traceback.format_exc())
    raise

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = None
    max_tokens: Optional[int] = 512
    temperature: Optional[float] = 0.7
    timeout: Optional[int] = 360
    echo_mode: Optional[bool] = False

class ChatResponse(BaseModel):
    response: str

@app.middleware("http")
async def log_chat_requests(request: Request, call_next):
    """Show processing message only for chat endpoint."""
    if request.url.path == "/chat" and request.method == "POST":
        print(f"\nProcessing chat request... ", end="", flush=True)
        response = await call_next(request)
        print("Done!")
        return response
    else:
        return await call_next(request)

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

@app.get("/diagnostics")
async def diagnostics():
    """Detailed diagnostics endpoint."""
    try:
        # System info
        import platform
        import psutil
        import sys
        
        # Get memory info
        memory = psutil.virtual_memory()
        
        # Gather diagnostics
        diag = {
            "api": "NeMo Guardrails API",
            "status": "running",
            "timestamp": str(datetime.datetime.now()),
            "system": {
                "python_version": sys.version,
                "platform": platform.platform(),
                "memory_total_mb": memory.total / (1024 * 1024),
                "memory_available_mb": memory.available / (1024 * 1024),
                "memory_used_percent": memory.percent
            },
            "config": {
                "llama_api_url": LLAMA_API_URL
            }
        }
        
        # Test LLM connectivity
        try:
            # Simple test prompt 
            test_message = {"role": "user", "content": "hello"}
            test_response = llm([test_message], max_tokens=5)
            diag["llm_test"] = {
                "status": "ok",
                "response": str(test_response)
            }
        except Exception as e:
            diag["llm_test"] = {
                "status": "error",
                "error": str(e)
            }
        
        # Get embedding model info
        try:
            import os
            cache_dir = os.path.expanduser("~/.cache")
            st_dir = os.path.join(cache_dir, "torch/sentence_transformers")
            
            diag["embeddings"] = {
                "cache_exists": os.path.exists(st_dir),
                "cache_dir": st_dir
            }
            
            if os.path.exists(st_dir):
                diag["embeddings"]["files"] = os.listdir(st_dir)
        except Exception as e:
            diag["embeddings"] = {
                "status": "error",
                "error": str(e)
            }
            
        return diag
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "api": "NeMo Guardrails API",
        "version": "1.0",
        "endpoints": {
            "/health": "Health check endpoint",
            "/chat": "Chat endpoint with guardrails"
        }
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint that processes the request through NeMo Guardrails."""
    try:
        # Check if echo mode is enabled for testing
        if request.echo_mode:
            print("Echo mode enabled - returning message without guardrails")
            return {"response": f"ECHO: {request.message}"}
        
        # Format the conversation history for guardrails
        messages = []
        if request.history:
            for msg in request.history:
                messages.append({"role": msg.role, "content": msg.content})
        
        # Add the new user message
        messages.append({"role": "user", "content": request.message})
        
        print(f"Sending message to guardrails: {request.message}")
        
        # Generate response using guardrails
        # With nest_asyncio.apply(), we can use the sync method in async context
        response = rails.generate(messages=messages)
        print(f"Response from guardrails: {response}")
        
        # Parse the response - could be a string or dict with 'content'
        if isinstance(response, dict) and "content" in response:
            response_text = response["content"]
        else:
            response_text = str(response)
            
        return {"response": response_text}
    
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        import traceback
        print(traceback.format_exc())
        return {"response": f"Error: {str(e)}"}

if __name__ == "__main__":
    # Simple startup message
    print("\nNeMo Guardrails API starting at http://localhost:8080")
    print("LLAMA API URL:", LLAMA_API_URL)
    print("---------------------------------------------")
    
    # Run uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8080, 
        log_level="error"
    )