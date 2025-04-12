from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from nemoguardrails import RailsConfig
from nemoguardrails import LLMRails
from custom_llm import CustomLLM
import os
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

class ChatRequest(BaseModel):
    message: str

# Get the LLama API URL from environment variable
llama_api_url = os.getenv("LLAMA_API_URL", "http://llama-api:8000")
logger.debug(f"Using LLAMA_API_URL: {llama_api_url}")

# Create a custom LLM instance
llm = CustomLLM(api_url=llama_api_url)

# Load the config
config_path = os.getenv("CONFIG_PATH", "/app/config/")
logger.debug(f"Loading config from: {config_path}")
config = RailsConfig.from_path(config_path)

# Create the rails with the custom LLM
rails = LLMRails(config, llm=llm)

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Generate a response using the rails
        response = rails.generate(messages=[{
            "role": "user",
            "content": request.message
        }])
        
        return response
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    logger.info(f"Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port) 