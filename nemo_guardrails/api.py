from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from nemoguardrails import RailsConfig
from nemoguardrails import LLMRails
from custom_llm import CustomLLM
import os

app = FastAPI(title="NeMo Guardrails API")

# Create a custom LLM instance
llm = CustomLLM(api_url=os.getenv("LLAMA_API_URL", "http://localhost:8000/generate"))

# Load the config
config = RailsConfig.from_path("./config")

# Create the rails with the custom LLM
rails = LLMRails(config, llm=llm)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        response = rails.generate(messages=[{
            "role": "user",
            "content": request.message
        }])
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port) 