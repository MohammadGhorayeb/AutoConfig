# This file is now just a simple script to test the guardrails locally
# For Docker, we'll use api.py instead

from nemoguardrails import RailsConfig
from nemoguardrails import LLMRails
from custom_llm import CustomLLM
import os
import logging

# Disable all logging except critical errors
logging.basicConfig(level=logging.CRITICAL)

def main():
    # Create a custom LLM instance quietly
    llm = CustomLLM()
    
    # Load the config
    config = RailsConfig.from_path("./nemo_guardrails/config")
    
    # Create the rails with the custom LLM
    rails = LLMRails(config, llm=llm)
    
    # Test cases
    test_cases = [
        "Tell me about the history of the internet"
    ]
    
    print("\n=== TESTING GUARDRAILS ===\n")
    
    # Run test cases
    for i, message in enumerate(test_cases):
        print(f"\n[TEST {i+1}]")
        print(f"User: {message}")
        print("---------------------")
        try:
            response = rails.generate(messages=[{
                "role": "user", 
                "content": message
            }])
            print(f"Assistant: {response}")
        except Exception as e:
            print(f"ERROR: {str(e)}")
        print("---------------------")

if __name__ == "__main__":
    main()