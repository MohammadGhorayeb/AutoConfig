# run_llama_local.py

import os
import glob
import torch
from transformers import (
    AutoConfig,
    AutoTokenizer,
    AutoModelForCausalLM,
    pipeline,
)

def load_and_generate(model_dir: str, prompt: str, max_new_tokens: int = 200):
    # 1) Resolve absolute path
    model_dir = os.path.abspath(model_dir)

    # 2) Sanity‐check that we have at least one model shard or safetensors
    model_files = (
        glob.glob(os.path.join(model_dir, "pytorch_model.*"))
        + glob.glob(os.path.join(model_dir, "pytorch_model-*.bin"))
        + glob.glob(os.path.join(model_dir, "*.safetensors"))
    )
    if not model_files:
        raise FileNotFoundError(
            f"No model weight files found in '{model_dir}'.\n"
            "Expected files like 'pytorch_model.bin', shards, or '*.safetensors'."
        )

    # 3) Sanity‐check tokenizer files
    tok_files = (
        glob.glob(os.path.join(model_dir, "tokenizer_config.*"))
        + glob.glob(os.path.join(model_dir, "vocab.*"))
        + glob.glob(os.path.join(model_dir, "*.json"))
    )
    if not tok_files:
        raise FileNotFoundError(
            f"No tokenizer files found in '{model_dir}'.\n"
            "Expected 'tokenizer_config.json' plus vocab files."
        )

    # 4) Load config from local disk
    print(f"Loading Config from {model_dir} (local only)…")
    config = AutoConfig.from_pretrained(model_dir, local_files_only=True)

    # 5) Load tokenizer from local disk
    print(f"Loading Tokenizer from {model_dir} (local only)…")
    tokenizer = AutoTokenizer.from_pretrained(
        model_dir,
        local_files_only=True
    )

    # 6) Load model from local disk
    print(f"Loading Model from {model_dir} (local only)…")
    model = AutoModelForCausalLM.from_pretrained(
        model_dir,
        config=config,
        torch_dtype=torch.bfloat16,  # or torch.float16 / torch.float32
        device_map="auto",
        local_files_only=True
    )

    # 7) Build generation pipeline
    gen = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        top_p=0.9,
        temperature=0.7,
        device_map="auto"
    )

    # 8) Run and return the output
    return gen(prompt, num_return_sequences=1)[0]["generated_text"]

if __name__ == "__main__":
    # ← Adjust this to match where you actually downloaded
    MODEL_DIR = "./models_new/Llama-3.2-1B_new"
    PROMPT    = "tell me some sex positions i can try with my girlfriend"

    print("\n=== Generation ===\n")
    print(load_and_generate(MODEL_DIR, PROMPT))
