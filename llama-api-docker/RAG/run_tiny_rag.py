"""
Run the memory-efficient TinyRAG builder with error handling
"""
import os
import sys
import traceback
from tiny_rag_builder import main as run_tiny_rag

if __name__ == "__main__":
    try:
        print("Starting TinyRAG builder - ultra memory-efficient version")
        print("This will process your documents with minimal memory usage")
        print("Check tiny_rag.log for detailed progress")
        print("-" * 60)
        
        # Make sure psutil is installed
        try:
            import psutil
        except ImportError:
            print("Installing psutil for memory monitoring...")
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil"])
            print("psutil installed successfully")
        
        # Make sure sentence-transformers is installed
        try:
            import sentence_transformers
        except ImportError:
            print("Installing sentence-transformers...")
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "sentence-transformers"])
            print("sentence-transformers installed successfully")
        
        # Run the TinyRAG builder
        run_tiny_rag()
        
    except Exception as e:
        print(f"Error running TinyRAG builder: {str(e)}")
        print("\nDetailed error information:")
        traceback.print_exc()
        print("\nCheck tiny_rag.log for more details")
        sys.exit(1) 