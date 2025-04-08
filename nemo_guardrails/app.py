# This file is now just a simple script to test the guardrails locally
# For Docker, we'll use api.py instead

from nemoguardrails import RailsConfig
from nemoguardrails import LLMRails
from custom_llm import CustomLLM

def main():
    # Create a custom LLM instance
    llm = CustomLLM(api_url="http://localhost:8000/generate")

    # Load the config
    config = RailsConfig.from_path("./config")

    # Create the rails with the custom LLM
    rails = LLMRails(config, llm=llm)

    # Test with a simple message
    response = rails.generate(messages=[{
        "role": "user",
        "content": "Hello!"
    }])
    print(response)

if __name__ == "__main__":
    main()