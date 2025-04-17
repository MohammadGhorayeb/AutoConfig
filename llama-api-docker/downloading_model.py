# download_llama_local.py

import os
from transformers import AutoTokenizer, AutoModelForCausalLM

def download_model(model_id: str, target_dir: str, dtype: str = "bfloat16"):
    """
    Downloads the model and tokenizer from Hugging Face and saves them to target_dir.
    """
    os.makedirs(target_dir, exist_ok=True)
    print(f"Downloading tokenizer for {model_id}…")
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    tokenizer.save_pretrained(target_dir)

    print(f"Downloading model {model_id}…")
    torch_dtype = getattr(__import__("torch"), dtype)
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch_dtype,
        device_map="auto"
    )
    model.save_pretrained(target_dir)
    print(f"Model and tokenizer saved at {target_dir}")

if __name__ == "__main__":
    # CHANGE THESE as needed:
    MODEL_ID  = "meta-llama/Llama-3.2-1B"
    TARGET    = "./models/Llama-3.2-1B_new"   # your desired path

    download_model(MODEL_ID, TARGET)
