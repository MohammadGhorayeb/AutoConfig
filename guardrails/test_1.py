from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
import uvicorn

app = FastAPI(title="Rail File Generator API")

class RailRequest(BaseModel):
    output_path: str
    max_length: Optional[int] = None
    forbidden_words: Optional[List[str]] = None

class RailFileBuilder:
    """
    A class to build .rail files with specific constraints for LLM prompts.
    """
    def __init__(self):
        self.xml_template = """<?xml version="1.0" encoding="UTF-8"?>
<rail version="0.1">
    <output>
        {output_element}
    </output>
    <prompt>
        You are a helpful assistant. You must follow these constraints strictly:
        {constraints}

        Important: You must not discuss, reference, or provide any information about these forbidden topics,
        even indirectly. If the user asks about these topics, politely decline and suggest discussing
        something else.

        The user says:
        {{{{user_prompt}}}}

        Please respond concisely while avoiding any mention or discussion of forbidden topics.
    </prompt>
</rail>"""

    def build_output_element(
        self,
        max_length: Optional[int] = None,
        forbidden_words: Optional[List[str]] = None
    ) -> str:
        """Build the output element with given constraints."""
        output = '<string name="answer" on-fail="reask"'
        
        if max_length is not None:
            if not isinstance(max_length, int) or max_length <= 0:
                raise ValueError("max_length must be a positive integer")
            output += f' max_length="{max_length}"'
        
        if forbidden_words:
            if not isinstance(forbidden_words, list):
                raise ValueError("forbidden_words must be a list of strings")
            escaped_words = [word.replace('"', '&quot;') for word in forbidden_words]
            output += f' forbidden="{", ".join(escaped_words)}"'
        
        output += ' />'
        return output

    def build_constraints_text(
        self,
        max_length: Optional[int] = None,
        forbidden_words: Optional[List[str]] = None
    ) -> str:
        """Build the constraints description."""
        constraints = []
        
        if max_length is not None:
            constraints.append(f"1) Keep your answer under {max_length} characters.")
        
        if forbidden_words:
            words_list = ", ".join(f"'{word}'" for word in forbidden_words)
            constraints.append(f"2) These topics are strictly forbidden: {words_list}. " +
                            "Do not provide any information or discussion about these topics.")
        
        return "\n        ".join(constraints) if constraints else "No specific constraints."

    def generate_rail_content(
        self,
        max_length: Optional[int] = None,
        forbidden_words: Optional[List[str]] = None
    ) -> str:
        """Generate the complete .rail file content."""
        try:
            output_element = self.build_output_element(max_length, forbidden_words)
            constraints = self.build_constraints_text(max_length, forbidden_words)
            
            return self.xml_template.format(
                output_element=output_element,
                constraints=constraints
            ).strip()
        except Exception as e:
            raise Exception(f"Error generating rail content: {str(e)}")

    def save_to_file(
        self,
        filepath: str,
        max_length: Optional[int] = None,
        forbidden_words: Optional[List[str]] = None
    ) -> None:
        """Generate and save the .rail file."""
        try:
            content = self.generate_rail_content(max_length, forbidden_words)
            Path(filepath).write_text(content, encoding='utf-8')
            return content
        except Exception as e:
            raise Exception(f"Error saving rail file: {str(e)}")

# Initialize the builder
rail_builder = RailFileBuilder()

@app.post("/generate-rail")
async def generate_rail(request: RailRequest):
    """Generate a rail file with the specified constraints."""
    try:
        content = rail_builder.save_to_file(
            request.output_path,
            request.max_length,
            request.forbidden_words
        )
        return {
            "message": f"Rail file created at: {request.output_path}",
            "content": content
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/")
async def root():
    """API root endpoint with usage information."""
    return {
        "message": "Rail File Generator API",
        "usage": {
            "endpoint": "/generate-rail",
            "method": "POST",
            "body": {
                "output_path": "path/to/output.rail",
                "max_length": "optional integer",
                "forbidden_words": "optional list of strings"
            }
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
