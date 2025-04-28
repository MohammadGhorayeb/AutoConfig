"""
Script to run the RAG system with memory monitoring and diagnostics
"""
import os
import sys
import subprocess
import argparse
import time
import psutil

def check_memory():
    """Check available memory and log it"""
    mem = psutil.virtual_memory()
    print(f"Available memory: {mem.available / (1024 * 1024):.2f} MB")
    print(f"Memory used: {mem.percent}%")
    
    return mem.available

def run_command(cmd, log_file=None):
    """Run a command and capture its output"""
    print(f"Running command: {cmd}")
    
    if log_file:
        with open(log_file, 'w') as f:
            process = subprocess.Popen(
                cmd, 
                stdout=f,
                stderr=subprocess.STDOUT,
                shell=True
            )
    else:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            shell=True,
            universal_newlines=True
        )
        
        # Print output in real-time
        for line in process.stdout:
            print(line.strip())
    
    return process

def create_index():
    """Create the RAG index using the diagnostic script"""
    print("\n==== Creating RAG Index ====")
    check_memory()
    
    # Use the diagnostic script to create the index
    cmd = f"{sys.executable} diagnose_embedding.py"
    process = run_command(cmd)
    process.wait()
    
    check_memory()
    print("\n==== Index Creation Completed ====")
    
    # Check if the index was created successfully
    embeddings_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "embeddings")
    index_path = os.path.join(embeddings_dir, "rag_index.json")
    embeddings_path = os.path.join(embeddings_dir, "chunk_embeddings.npy")
    
    if os.path.exists(index_path) and os.path.exists(embeddings_path):
        print("✅ RAG index created successfully!")
        return True
    else:
        print("❌ Failed to create RAG index.")
        return False

def run_rag_server(lightweight=True):
    """Run the RAG server"""
    print("\n==== Starting RAG Server ====")
    check_memory()
    
    # Choose which server to run
    if lightweight:
        cmd = f"{sys.executable} light_rag.py"
        log_file = "light_rag_server.log"
    else:
        cmd = f"{sys.executable} rag_server.py"
        log_file = "rag_server.log"
    
    process = run_command(cmd, log_file)
    
    # Wait a bit for the server to start
    time.sleep(3)
    
    print(f"\nRAG server running in the background. Logs in {log_file}")
    print("To stop the server, press Ctrl+C")
    
    return process

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the RAG system")
    parser.add_argument("--create-index", action="store_true", help="Create the RAG index")
    parser.add_argument("--lightweight", action="store_true", help="Use the lightweight RAG server")
    args = parser.parse_args()
    
    try:
        if args.create_index:
            success = create_index()
            if not success:
                print("Exiting due to index creation failure.")
                sys.exit(1)
        
        # Run the RAG server
        server_process = run_rag_server(lightweight=args.lightweight)
        
        print("\nRAG system is now running!")
        print("You can now query the RAG system at http://localhost:8001/rag/query")
        print("Use Ctrl+C to stop the server.")
        
        # Keep the server running until interrupted
        while True:
            time.sleep(1)
    
    except KeyboardInterrupt:
        print("\nShutting down RAG system...")
        sys.exit(0) 