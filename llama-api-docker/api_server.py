from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import torch
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from transformers import (
    AutoConfig,
    AutoTokenizer,
    AutoModelForCausalLM,
    pipeline,
)

# Initialize FastAPI app
app = FastAPI(title="Llama API Server")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add simple health check route
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Model configuration
MODEL_DIR = os.getenv("MODEL_DIR", "./llama-api-docker/models/Llama-3.2-1B")

# Initialize model and tokenizer globally
print(f"Loading model from {MODEL_DIR}...")

try:
    # Load config from local disk
    config = AutoConfig.from_pretrained(MODEL_DIR, local_files_only=True, trust_remote_code=True)
    print("Config loaded successfully")

    # Load tokenizer from local disk
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_DIR,
        local_files_only=True,
        trust_remote_code=True
    )
    print("Tokenizer loaded successfully")

    # Load model from local disk
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_DIR,
        config=config,
        torch_dtype=torch.bfloat16,  # or torch.float16 / torch.float32
        device_map="auto",
        local_files_only=True,
        trust_remote_code=True
    )
    print("Model loaded successfully")

    # Build generation pipeline
    generator = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        device_map="auto"
    )
    print("Pipeline created successfully")
    
    MODEL_READY = True
except Exception as e:
    print(f"Error loading model: {str(e)}")
    MODEL_READY = False
    # We'll continue anyway to allow the health check endpoint to work

class PromptRequest(BaseModel):
    prompt: str
    max_tokens: int = 100
    temperature: float = 0.7
    stop: list = ["Q:"]
    top_p: float = 0.9

class PromptResponse(BaseModel):
    response: str
    
@app.post("/generate", response_model=PromptResponse)
async def generate_response(request: PromptRequest):
    if not MODEL_READY:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
        
    try:
        print(f"Received prompt: {request.prompt[:50]}...")
        
        # Detect if this is a RAG prompt
        is_rag_prompt = "Context information:" in request.prompt and "You are a helpful assistant" in request.prompt
        
        # Process the prompt to remove template instructions if it's a RAG prompt
        processed_prompt = request.prompt
        if is_rag_prompt:
            # Extract just the user question
            user_question = None
            if "User question:" in request.prompt:
                question_parts = request.prompt.split("User question:", 1)
                if len(question_parts) > 1:
                    question_text = question_parts[1].split("\n\n", 1)[0].strip()
                    user_question = question_text
            
            # If we can't extract the question, just use a simplified prompt
            if not user_question:
                processed_prompt = "Answer based on the provided information."
            else:
                # Create a simplified prompt that avoids template leakage
                processed_prompt = f"""Answer this question using the information from the documents: {user_question}"""
        
        # Generate response
        output = generator(
            processed_prompt,
            max_new_tokens=request.max_tokens,
            do_sample=True,
            top_p=request.top_p,
            temperature=request.temperature,
            num_return_sequences=1
        )
        
        # Get raw generated text
        generated_text = output[0]["generated_text"]
        
        # Process RAG response
        if is_rag_prompt:
            # If using processed prompt, need more filtering
            if generated_text.startswith(processed_prompt):
                answer = generated_text[len(processed_prompt):].strip()
            else:
                answer = generated_text
                
            # Clean up any remaining template artifacts
            for phrase in ["You are a helpful assistant", "Context information:", "User question:", 
                          "Answer the question based on", "Example:", "import jinja"]:
                if phrase in answer:
                    parts = answer.split(phrase, 1)
                    if len(parts) > 1:
                        # Keep the part before the template phrase
                        answer = parts[0].strip()
            
            # If we have a clean answer, return it, otherwise extract the most relevant part
            if not answer or len(answer) < 10:
                # Try a different approach - look for complete sentences
                sentences = [s.strip() for s in generated_text.split('.') if len(s.strip()) > 20]
                if sentences:
                    # Get the longest sentence that doesn't contain template artifacts
                    clean_sentences = [s for s in sentences if not any(phrase in s for phrase in 
                                     ["You are a helpful assistant", "Context information:", "User question:"])]
                    if clean_sentences:
                        answer = max(clean_sentences, key=len) + "."
            
            return PromptResponse(response=answer)
        else:
            # For non-RAG prompts, just return the generated text
            if generated_text.startswith(request.prompt):
                answer = generated_text[len(request.prompt):].strip()
            else:
                answer = generated_text
                
            return PromptResponse(response=answer)
            
    except Exception as e:
        print(f"Error generating response: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-info")
async def get_model_info():
    try:
        if not MODEL_READY:
            return {
                "status": "loading",
                "model_dir": MODEL_DIR
            }
            
        return {
            "status": "ready",
            "model_dir": MODEL_DIR,
            "model_name": model.config.name_or_path,
            "model_type": model.config.model_type,
            "vocab_size": len(tokenizer)
        }
    except Exception as e:
        print(f"Error getting model info: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "model_dir": MODEL_DIR
        }

if __name__ == "__main__":
    print("Starting the Llama API server...")
    print(f"Model directory: {MODEL_DIR}")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 