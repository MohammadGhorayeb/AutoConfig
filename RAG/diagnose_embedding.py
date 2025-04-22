import os
import sys
import logging
import traceback
import numpy as np
import glob
from sentence_transformers import SentenceTransformer
from utils.document_processor import DocumentProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("rag_diagnostic.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("RAG-Diagnostic")

def process_documents_safely(
    documents_dir="./documents", 
    embeddings_dir="./embeddings",
    chunk_size=512,
    chunk_overlap=128,
    batch_size=10  # Process in smaller batches
):
    """Process documents with safer memory usage and detailed error reporting"""
    
    try:
        logger.info(f"Starting diagnostic on documents in {documents_dir}")
        
        # Check if directories exist
        if not os.path.exists(documents_dir):
            logger.error(f"Documents directory {documents_dir} not found")
            return False
            
        if not os.path.exists(embeddings_dir):
            logger.info(f"Creating embeddings directory {embeddings_dir}")
            os.makedirs(embeddings_dir)
        
        # Initialize document processor
        logger.info("Initializing document processor")
        document_processor = DocumentProcessor(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        
        # Find all document files
        document_files = glob.glob(os.path.join(documents_dir, "**"), recursive=True)
        document_files = [f for f in document_files if os.path.isfile(f)]
        
        if not document_files:
            logger.error(f"No documents found in {documents_dir}")
            return False
            
        logger.info(f"Found {len(document_files)} documents")
        
        # Process documents and collect chunks
        all_chunks = []
        document_metadata = []
        document_index = {}
        chunk_counter = 0
        
        for doc_idx, doc_path in enumerate(document_files):
            try:
                logger.info(f"Processing document {doc_idx+1}/{len(document_files)}: {os.path.basename(doc_path)}")
                
                # Process document into chunks
                doc_data = document_processor.process_document(doc_path)
                
                # Add document metadata
                document_metadata.append({
                    "filename": doc_data["filename"],
                    "path": doc_data["path"],
                    "doc_index": doc_idx,
                    "num_chunks": doc_data["num_chunks"]
                })
                
                # Add chunks and update index
                for chunk_idx, chunk in enumerate(doc_data["chunks"]):
                    global_chunk_idx = chunk_counter
                    all_chunks.append(chunk)
                    document_index[global_chunk_idx] = {
                        "doc_idx": doc_idx,
                        "chunk_idx": chunk_idx
                    }
                    chunk_counter += 1
                
                logger.info(f"Document {doc_data['filename']} processed into {doc_data['num_chunks']} chunks")
            except Exception as e:
                logger.error(f"Error processing document {doc_path}")
                logger.error(traceback.format_exc())
        
        total_chunks = len(all_chunks)
        logger.info(f"Total chunks to embed: {total_chunks}")
        
        if total_chunks == 0:
            logger.error("No chunks created from documents")
            return False
        
        # Initialize the embedding model with explicit cache location
        try:
            cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model_cache")
            if not os.path.exists(cache_dir):
                os.makedirs(cache_dir)
                
            logger.info(f"Loading embedding model (all-MiniLM-L6-v2) with cache dir: {cache_dir}")
            embedding_model = SentenceTransformer('all-MiniLM-L6-v2', cache_folder=cache_dir)
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error("Failed to load embedding model")
            logger.error(traceback.format_exc())
            return False
        
        # Process chunks in batches to reduce memory usage
        embeddings_list = []
        for i in range(0, total_chunks, batch_size):
            batch = all_chunks[i:i+batch_size]
            logger.info(f"Embedding batch {i//batch_size + 1}/{(total_chunks+batch_size-1)//batch_size} ({len(batch)} chunks)")
            try:
                batch_embeddings = embedding_model.encode(batch, show_progress_bar=True)
                embeddings_list.append(batch_embeddings)
                logger.info(f"Batch {i//batch_size + 1} embedded successfully")
            except Exception as e:
                logger.error(f"Error embedding batch {i//batch_size + 1}")
                logger.error(traceback.format_exc())
                return False
        
        # Combine all batch embeddings
        logger.info("Combining all embeddings")
        all_embeddings = np.vstack(embeddings_list)
        
        # Save embeddings
        embeddings_path = os.path.join(embeddings_dir, "chunk_embeddings.npy")
        logger.info(f"Saving embeddings to {embeddings_path}")
        np.save(embeddings_path, all_embeddings)
        
        # Create index file path
        index_path = os.path.join(embeddings_dir, "rag_index.json")
        
        # Import json here to avoid any issues
        import json
        
        # Save index mapping
        with open(index_path, 'w') as f:
            index_data = {
                "metadata": document_metadata,
                "document_index": {str(k): v for k, v in document_index.items()},
                "embedding_model": "all-MiniLM-L6-v2",
                "chunk_size": chunk_size,
                "chunk_overlap": chunk_overlap,
                "num_chunks": total_chunks
            }
            json.dump(index_data, f, indent=2)
        
        logger.info(f"RAG index created successfully with {total_chunks} chunks from {len(document_files)} documents")
        return True
        
    except Exception as e:
        logger.error("Unhandled exception in document processing")
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    # Get current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Set paths relative to script location
    documents_dir = os.path.join(current_dir, "documents")
    embeddings_dir = os.path.join(current_dir, "embeddings")
    
    # Display memory usage information
    import psutil
    process = psutil.Process(os.getpid())
    logger.info(f"Initial memory usage: {process.memory_info().rss / (1024 * 1024):.2f} MB")
    
    # Set smaller batch size if low memory
    available_memory = psutil.virtual_memory().available / (1024 * 1024)
    logger.info(f"Available system memory: {available_memory:.2f} MB")
    
    batch_size = 5 if available_memory < 1000 else 10
    logger.info(f"Using batch size: {batch_size}")
    
    success = process_documents_safely(
        documents_dir=documents_dir,
        embeddings_dir=embeddings_dir,
        batch_size=batch_size
    )
    
    if success:
        logger.info("Diagnostic completed successfully")
        print("RAG index created successfully! Check rag_diagnostic.log for details.")
    else:
        logger.error("Diagnostic failed")
        print("Failed to create RAG index. Check rag_diagnostic.log for errors.")
    
    # Final memory usage
    logger.info(f"Final memory usage: {process.memory_info().rss / (1024 * 1024):.2f} MB") 