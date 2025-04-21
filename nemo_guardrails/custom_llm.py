from langchain.llms.base import LLM
from typing import Any, List, Mapping, Optional
import requests
from nemoguardrails.llm.providers import register_llm_provider


class CustomLLM(LLM):
    """Custom LLM implementation that calls the local Llama API"""
    
    api_url: str = "http://localhost:8000/generate"
    temperature: float = 0.7
    max_tokens: int = 512
    top_p: float = 0.95
    
    @property
    def _llm_type(self) -> str:
        return "custom_llama"
    
    def _call(self, prompt: str, stop: Optional[List[str]] = None, run_manager=None, **kwargs) -> str:
        """Call the custom LLM API."""
        # Get parameters with defaults from either the instance or kwargs
        temperature = kwargs.get("temperature", self.temperature)
        max_tokens = kwargs.get("max_tokens", self.max_tokens)
        top_p = kwargs.get("top_p", self.top_p)
        
        # If stop is None, use default
        if stop is None:
            stop = ["Q:"]
            
        # Prepare the request payload
        payload = {
            "prompt": prompt,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": top_p,
            "stop": stop
        }
        
        # Make the API call
        response = requests.post(self.api_url, json=payload)
        
        # Check if the request was successful
        if response.status_code == 200:
            raw_text = response.json()["response"]
            
            # Clean the response - extract only the assistant's response
            # If this is a conversation format, extract just the assistant's reply
            if "User:" in raw_text and "Assistant:" in raw_text:
                parts = raw_text.split("Assistant:")
                if len(parts) > 1:
                    # Get the last assistant response
                    assistant_response = parts[-1].strip()
                    # Remove anything after a new "User:" if present
                    if "User:" in assistant_response:
                        assistant_response = assistant_response.split("User:")[0].strip()
                    return assistant_response
            
            # If it's already echoing the prompt, remove that part
            if prompt in raw_text and len(raw_text) > len(prompt):
                return raw_text[len(prompt):].strip()
                
            return raw_text
        else:
            raise Exception(f"API call failed with status code {response.status_code}: {response.text}")
    
    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        """Get the identifying parameters."""
        return {
            "api_url": self.api_url,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p
        }


# Tell NeMo Guardrails we can use this LLM
register_llm_provider("custom", CustomLLM)



