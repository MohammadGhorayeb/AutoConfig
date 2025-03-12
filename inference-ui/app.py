from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import httpx
import uvicorn
from pydantic import BaseModel
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
LLAMA_API_URL = os.getenv("LLAMA_API_URL", "http://localhost:8000")

class PromptRequest(BaseModel):
    prompt: str
    max_tokens: int = 100
    temperature: float = 0.7
    stop: list = ["Q:"]

@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

@app.post("/api/generate")
async def proxy_generate(request: PromptRequest):
    async with httpx.AsyncClient() as client:
        try:
            print(f"Sending request to: {LLAMA_API_URL}/generate")
            print(f"Request data: {request.dict()}")
            response = await client.post(
                f"{LLAMA_API_URL}/generate",
                json=request.dict(),
                timeout=100.0
            )
            # Get the response content first
            response_data = response.json()
            print(f"Response from API: {response_data}")
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
            response = await client.get(f"{LLAMA_API_URL}/model-info")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))
    uvicorn.run(app, host="0.0.0.0", port=port) 