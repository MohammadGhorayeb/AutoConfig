from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import multiprocessing
from llama_cpp import Llama
import uvicorn

app = FastAPI(title="Llama API Server")

# Model configuration
MODEL_PATH = "./models/Llama-3.2-3B-Instruct-Q4_K_M.gguf"
NUM_THREADS = multiprocessing.cpu_count()

# Initialize the model globally
llm = Llama(
    model_path=MODEL_PATH,
    n_ctx=2048,
    n_threads=NUM_THREADS
)

class PromptRequest(BaseModel):
    prompt: str
    max_tokens: int = 100
    temperature: float = 0.7
    stop: list = ["Q:"]

class PromptResponse(BaseModel):
    response: str
    
@app.post("/generate", response_model=PromptResponse)
async def generate_response(request: PromptRequest):
    try:
        output = llm(
            request.prompt,
            max_tokens=request.max_tokens,
            stop=request.stop,
            temperature=request.temperature
        )
        return PromptResponse(response=output['choices'][0]['text'].strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-info")
async def get_model_info():
    return {
        "context_window": llm.n_ctx(),
        "vocabulary_size": llm.n_vocab(),
        "embedding_size": llm.n_embd()
    }

if __name__ == "__main__":
    print("Starting the Llama API server...")
    print(f"Loading model from: {MODEL_PATH}")
    print(f"Using {NUM_THREADS} CPU threads")
    uvicorn.run(app, host="0.0.0.0", port=8000) 