from langchain.llms.base import LLM
from typing import Any, List, Mapping, Optional
import requests

class CustomLLM(LLM):
    api_url: str = "http://localhost:8000/generate"
    
    @property
    def _llm_type(self) -> str:
        return "custom_llama"
    
    def _call(self, prompt: str, stop: Optional[List[str]] = None, run_manager=None, **kwargs) -> str:
        """Call the custom LLM API."""
        temperature = kwargs.get("temperature", 0.7)
        max_tokens = kwargs.get("max_tokens", 100)
        
        # If stop is None, use default
        if stop is None:
            stop = ["Q:"]
            
        # Prepare the request payload
        payload = {
            "prompt": prompt,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stop": stop
        }
        
        # Make the API call
        response = requests.post(self.api_url, json=payload)
        
        # Check if the request was successful
        if response.status_code == 200:
            return response.json()["response"]
        else:
            raise Exception(f"API call failed with status code {response.status_code}: {response.text}")
    
    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        """Get the identifying parameters."""
        return {"api_url": self.api_url}