import os, sys, logging, datetime, platform, psutil
from typing import List, Optional

import nest_asyncio, uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from nemoguardrails import RailsConfig, LLMRails
from custom_llm import CustomLLM

nest_asyncio.apply()
logging.basicConfig(level=logging.INFO)

# ----------------------------------------------------------------------
# initialise guardrails
# ----------------------------------------------------------------------
CONFIG_DIR = os.path.join(os.path.dirname(__file__),
                          ".", "config")
llm    = CustomLLM()
config = RailsConfig.from_path(CONFIG_DIR)
rails  = LLMRails(config, llm=llm)

# ----------------------------------------------------------------------
# FastAPI plumbing
# ----------------------------------------------------------------------
app = FastAPI(title="NeMo Guardrails API",
              description="LLM endpoint protected by NeMo Guardrails")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"],  allow_headers=["*"],
)

# ----------------------------------------------------------------------
# models
# ----------------------------------------------------------------------
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

# ----------------------------------------------------------------------
# routes
# ----------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if req.echo_mode:
        return {"response": f"ECHO: {req.message}"}

    messages = [m.model_dump() for m in (req.history or [])]
    messages.append({"role": "user", "content": req.message})

    try:
        rsp = await rails.generate_async(messages=messages)
    except Exception as e:
        logging.exception("Guardrails failure")
        raise HTTPException(status_code=500, detail=str(e))

    # LLMRails returns a plain string by default
    return {"response": rsp if isinstance(rsp, str) else rsp.get("content", str(rsp))}

@app.get("/diagnostics")
async def diagnostics():
    mem = psutil.virtual_memory()
    return {
        "python": sys.version,
        "platform": platform.platform(),
        "memory_used_pct": mem.percent,
    }

@app.get("/")
async def root():
    return {
        "api": "NeMo Guardrails",
        "version": "1.0",
        "endpoints": ["/health", "/chat", "/diagnostics"],
    }

# ----------------------------------------------------------------------
# uvicorn entry-point (for `python api.py`)
# ----------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8080, log_level="info")
