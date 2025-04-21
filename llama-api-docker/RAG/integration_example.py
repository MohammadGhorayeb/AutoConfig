#!/usr/bin/env python3
import argparse
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Default URLs
LLAMA_API_URL = os.getenv("LLAMA_API_URL", "http://localhost:8000")
RAG_API_URL = os.getenv("RAG_API_URL", "http://localhost:8001")

def query_with_rag(query, max_tokens=1000, temperature=0.7, rag_enabled=True):
    """
    Process a query using the RAG system and then the LLaMA API
    
    Args:
        query (str): User query
        max_tokens (int): Maximum tokens to generate
        temperature (float): Temperature for generation
        rag_enabled (bool): Whether to use RAG enhancement
        
    Returns:
        dict: Response containing results
    """
    print(f"Processing query: {query}")
    print(f"RAG enabled: {rag_enabled}")
    
    # Step 1: Query the RAG system for document context
    try:
        rag_response = requests.post(
            f"{RAG_API_URL}/rag/query",
            json={
                "query": query,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "rag_enabled": rag_enabled
            },
            timeout=30
        )
        
        if not rag_response.ok:
            print(f"Error from RAG API: {rag_response.status_code}")
            print(rag_response.text)
            return {"error": f"RAG API error: {rag_response.status_code}"}
        
        rag_data = rag_response.json()
        
        if rag_enabled:
            print("\nRetrieved context documents:")
            for i, doc in enumerate(rag_data.get("context_documents", [])):
                print(f"Document {i+1}: {doc['document']} (Score: {doc['score']:.4f})")
                print(f"Snippet: {doc['snippet']}\n")
        
        # Step 2: Use the augmented prompt to query the LLaMA API
        prompt = rag_data.get("augmented_prompt", query)
        
        llm_response = requests.post(
            f"{LLAMA_API_URL}/generate",
            json={
                "prompt": prompt,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": 0.9,
                "stop": ["Q:"]
            },
            timeout=60
        )
        
        if not llm_response.ok:
            print(f"Error from LLaMA API: {llm_response.status_code}")
            print(llm_response.text)
            return {"error": f"LLaMA API error: {llm_response.status_code}"}
        
        llm_data = llm_response.json()
        
        # Return combined results
        return {
            "query": query,
            "rag_enabled": rag_enabled,
            "context_documents": rag_data.get("context_documents", []),
            "response": llm_data.get("response", "")
        }
        
    except Exception as e:
        print(f"Error processing query: {str(e)}")
        return {"error": str(e)}

def add_document(file_path):
    """
    Add a document to the RAG system
    
    Args:
        file_path (str): Path to the document file
        
    Returns:
        dict: Response from the RAG system
    """
    try:
        response = requests.post(
            f"{RAG_API_URL}/rag/document",
            json={"file_path": file_path},
            timeout=30
        )
        
        if response.ok:
            return response.json()
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return {"error": f"API error: {response.status_code}"}
            
    except Exception as e:
        print(f"Error adding document: {str(e)}")
        return {"error": str(e)}

def create_index():
    """
    Create or recreate the RAG index
    
    Returns:
        dict: Response from the RAG system
    """
    try:
        response = requests.post(
            f"{RAG_API_URL}/rag/index",
            timeout=60
        )
        
        if response.ok:
            return response.json()
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return {"error": f"API error: {response.status_code}"}
            
    except Exception as e:
        print(f"Error creating index: {str(e)}")
        return {"error": str(e)}

def list_documents():
    """
    List all documents in the RAG index
    
    Returns:
        dict: Response from the RAG system
    """
    try:
        response = requests.get(
            f"{RAG_API_URL}/rag/documents",
            timeout=30
        )
        
        if response.ok:
            return response.json()
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return {"error": f"API error: {response.status_code}"}
            
    except Exception as e:
        print(f"Error listing documents: {str(e)}")
        return {"error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="RAG-enhanced LLaMA API Client")
    
    # Create subparsers for different commands
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Query command
    query_parser = subparsers.add_parser("query", help="Process a query with RAG and LLaMA")
    query_parser.add_argument("text", help="Query text")
    query_parser.add_argument("--no-rag", action="store_true", help="Disable RAG enhancement")
    query_parser.add_argument("--max-tokens", type=int, default=1000, help="Maximum tokens to generate")
    query_parser.add_argument("--temperature", type=float, default=0.7, help="Temperature for generation")
    
    # Add document command
    add_doc_parser = subparsers.add_parser("add-document", help="Add a document to the RAG index")
    add_doc_parser.add_argument("file_path", help="Path to the document file")
    
    # Create index command
    subparsers.add_parser("create-index", help="Create or recreate the RAG index")
    
    # List documents command
    subparsers.add_parser("list-documents", help="List all documents in the RAG index")
    
    # Parse arguments
    args = parser.parse_args()
    
    # Execute the appropriate command
    if args.command == "query":
        result = query_with_rag(
            query=args.text,
            max_tokens=args.max_tokens,
            temperature=args.temperature,
            rag_enabled=not args.no_rag
        )
        
        if "error" not in result:
            print("\n--- RAG-Enhanced LLaMA Response ---")
            print(result["response"])
        else:
            print(f"Error: {result['error']}")
            
    elif args.command == "add-document":
        result = add_document(args.file_path)
        
        if "error" not in result:
            print(f"Success: {result.get('message', 'Document added')}")
        else:
            print(f"Error: {result['error']}")
            
    elif args.command == "create-index":
        result = create_index()
        
        if "error" not in result:
            print(f"Success: {result.get('message', 'Index created')}")
        else:
            print(f"Error: {result['error']}")
            
    elif args.command == "list-documents":
        result = list_documents()
        
        if "error" not in result:
            print(f"Documents in RAG index: {result.get('total', 0)}")
            for i, doc in enumerate(result.get("documents", [])):
                print(f"{i+1}. {doc['filename']} ({doc['chunks']} chunks)")
        else:
            print(f"Error: {result['error']}")
            
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 