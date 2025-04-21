from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import httpx
import uvicorn
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="Llama Inference UI")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get Llama API URL from environment variable or use default
LLAMA_API_URL = os.getenv("LLAMA_API_URL", "http://localhost:8080")

class Message(BaseModel):
    role: str
    content: str

class PromptRequest(BaseModel):
    prompt: str
    max_tokens: int = 100
    temperature: float = 0.7
    stop: list = ["Q:"]

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = None
    max_tokens: Optional[int] = 512
    temperature: Optional[float] = 0.7
    timeout: Optional[int] = 60

@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

@app.post("/api/generate")
async def proxy_generate(request: PromptRequest):
    """Send request to either /generate (llama-api) or /chat (nemo-guardrails) based on the detected endpoint."""
    async with httpx.AsyncClient() as client:
        try:
            # First check if we're talking to nemo-guardrails by checking for /health endpoint
            try:
                health_check = await client.get(f"{LLAMA_API_URL}/health", timeout=5.0)
                chat_check = await client.get(f"{LLAMA_API_URL}/chat", timeout=2.0)
                
                # Check if URL has "nemo-guardrails" in it or if we get a 200 from chat endpoint check
                # This indicates we're pointing to the guardrails service
                is_guardrails = "nemo-guardrails" in LLAMA_API_URL or health_check.status_code == 200
                has_generate = False
                
                try:
                    # Try to check if /generate endpoint exists
                    gen_check = await client.options(f"{LLAMA_API_URL}/generate", timeout=2.0)
                    has_generate = gen_check.status_code < 400
                except:
                    has_generate = False
                
                # If we're pointing to nemo-guardrails but trying to use /generate, switch to /chat
                if is_guardrails and not has_generate:
                    print("Detected nemo-guardrails API - forwarding to /chat endpoint")
                    # Convert from generate format to chat format
                    chat_request = ChatRequest(
                        message=request.prompt,
                        max_tokens=request.max_tokens,
                        temperature=request.temperature
                    )
                    
                    # Use the /chat endpoint instead
                    response = await client.post(
                        f"{LLAMA_API_URL}/chat",
                        json=chat_request.dict(),
                        timeout=120.0
                    )
                    response_data = response.json()
                    print(f"Response from nemo-guardrails: {response_data}")
                    
                    # Convert the nemo-guardrails response format to match llama-api format for the UI
                    if "response" in response_data:
                        return {
                            "text": response_data["response"],
                            "model": "Guardrailed LLM",
                            "guardrailed": True
                        }
                    # Handle role/content format
                    elif isinstance(response_data, dict) and "role" in response_data and "content" in response_data:
                        return {
                            "text": response_data["content"],
                            "model": "Guardrailed LLM",
                            "guardrailed": True
                        }
                    
                    return response_data
            except Exception as e:
                # If health check fails, assume it's the regular llama-api
                print(f"API check failed, assuming direct llama-api: {e}")
            
            # Default to original behavior - direct to /generate endpoint
            print(f"Sending request to: {LLAMA_API_URL}/generate")
            print(f"Request data: {request.dict()}")
            
            try:
                response = await client.post(
                    f"{LLAMA_API_URL}/generate",
                    json=request.dict(),
                    timeout=100.0
                )
                # Get the response content
                response_data = response.json()
                print(f"Response from API: {response_data}")
                return response_data
            except httpx.HTTPStatusError as status_error:
                if status_error.response.status_code == 404:
                    # If we get a 404 on /generate, maybe we're still talking to guardrails
                    # Try the /chat endpoint as a fallback
                    print("Got 404 on /generate, trying /chat endpoint")
                    chat_request = ChatRequest(
                        message=request.prompt,
                        max_tokens=request.max_tokens,
                        temperature=request.temperature
                    )
                    response = await client.post(
                        f"{LLAMA_API_URL}/chat",
                        json=chat_request.dict(),
                        timeout=120.0
                    )
                    response_data = response.json()
                    print(f"Response from fallback /chat: {response_data}")
                    
                    if "response" in response_data:
                        return {
                            "text": response_data["response"],
                            "model": "Guardrailed LLM",
                            "guardrailed": True
                        }
                    # Handle role/content format
                    elif isinstance(response_data, dict) and "role" in response_data and "content" in response_data:
                        return {
                            "text": response_data["content"],
                            "model": "Guardrailed LLM",
                            "guardrailed": True
                        }
                    
                    return response_data
                else:
                    raise
        except httpx.HTTPError as e:
            print(f"HTTP Error: {str(e)}")
            if hasattr(e, 'response'):
                print(f"Response content: {e.response.text}")
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Direct chat endpoint for nemo-guardrails."""
    async with httpx.AsyncClient() as client:
        try:
            print(f"Sending chat request to: {LLAMA_API_URL}/chat")
            print(f"Request data: {request.dict()}")
            response = await client.post(
                f"{LLAMA_API_URL}/chat",
                json=request.dict(),
                timeout=120.0
            )
            response_data = response.json()
            print(f"Response from chat API: {response_data}")
            
            # Handle different response formats
            if isinstance(response_data, dict):
                # If we get a response with role/content format, convert it to just the content
                if "role" in response_data and "content" in response_data:
                    return {
                        "response": response_data["content"],
                        "guardrails": True
                    }
            
            return response_data
        except httpx.HTTPError as e:
            print(f"HTTP Error: {str(e)}")
            if hasattr(e, 'response'):
                print(f"Response content: {e.response.text}")
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/model-info")
async def proxy_model_info():
    async with httpx.AsyncClient() as client:
        try:
            # Try the nemo-guardrails diagnostics endpoint first
            try:
                response = await client.get(f"{LLAMA_API_URL}/diagnostics", timeout=5.0)
                if response.status_code == 200:
                    diag_data = response.json()
                    return {
                        "model": "NeMo Guardrails",
                        "parameters": "Varies",
                        "guardrails": True,
                        "diagnostics": diag_data
                    }
            except:
                pass
                
            # Fall back to the llama-api model-info
            response = await client.get(f"{LLAMA_API_URL}/model-info", timeout=5.0)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            # If both fail, return basic info
            return {
                "model": "Unknown",
                "parameters": "Unknown",
                "status": "API Endpoint not available"
            }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))
    uvicorn.run(app, host="0.0.0.0", port=port) 