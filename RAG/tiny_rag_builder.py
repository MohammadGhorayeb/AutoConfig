"""
Minimal memory usage RAG index builder
Processes one document at a time and uses line-by-line processing
"""
import os
import sys
import json
import logging
import numpy as np
import glob
import gc  # Garbage collection
from sentence_transformers import SentenceTransformer
from utils.tiny_document_processor import TinyDocumentProcessor

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("tiny_rag.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("TinyRAG")

class TinyRAGBuilder:
    def __init__(self, 
                documents_dir="./documents",
                embeddings_dir="./embeddings",
                chunk_size=256,  # Smaller chunks
                chunk_overlap=64,  # Less overlap
                batch_size=3):    # Tiny batch size
        
        self.documents_dir = documents_dir
        self.embeddings_dir = embeddings_dir
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.batch_size = batch_size
        
        # Create directories if they don't exist
        if not os.path.exists(self.embeddings_dir):
            os.makedirs(self.embeddings_dir)
            
        # Initialize components
        self.document_processor = TinyDocumentProcessor(
            chunk_size=self.chunk_size, 
            chunk_overlap=self.chunk_overlap
        )
        
        # Initialize placeholders
        self.embedding_model = None
        self.document_chunks = []
        self.document_metadata = []
        self.document_index = {}
        self.index_path = os.path.join(self.embeddings_dir, "rag_index.json")
        self.embeddings_path = os.path.join(self.embeddings_dir, "chunk_embeddings.npy")
    
    def load_embedding_model(self):
        """Load the embedding model with explicit cache location"""
        try:
            cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model_cache")
            if not os.path.exists(cache_dir):
                os.makedirs(cache_dir)
                
            logger.info(f"Loading embedding model (all-MiniLM-L6-v2) with cache dir: {cache_dir}")
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2', cache_folder=cache_dir)
            logger.info("Embedding model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load embedding model: {str(e)}")
            return False
    
    def process_single_document(self, doc_path, doc_idx):
        """Process a single document and save its chunks"""
        try:
            logger.info(f"Processing document {os.path.basename(doc_path)}")
            
            # Process document to chunks
            doc_data = self.document_processor.process_document(doc_path)
            
            # Add metadata
            self.document_metadata.append({
                "filename": doc_data["filename"],
                "path": doc_data["path"],
                "doc_index": doc_idx,
                "num_chunks": doc_data["num_chunks"]
            })
            
            # Add chunks and update index
            start_idx = len(self.document_chunks)
            for chunk_idx, chunk in enumerate(doc_data["chunks"]):
                global_chunk_idx = start_idx + chunk_idx
                self.document_chunks.append(chunk)
                self.document_index[global_chunk_idx] = {
                    "doc_idx": doc_idx,
                    "chunk_idx": chunk_idx
                }
            
            logger.info(f"Document processed: {len(doc_data['chunks'])} chunks created")
            return True
        except Exception as e:
            logger.error(f"Error processing document {doc_path}: {str(e)}")
            return False
    
    def save_index_data(self):
        """Save the document metadata and index mapping"""
        try:
            with open(self.index_path, 'w') as f:
                index_data = {
                    "metadata": self.document_metadata,
                    "document_index": {str(k): v for k, v in self.document_index.items()},
                    "embedding_model": "all-MiniLM-L6-v2",
                    "chunk_size": self.chunk_size,
                    "chunk_overlap": self.chunk_overlap,
                    "num_chunks": len(self.document_chunks)
                }
                json.dump(index_data, f, indent=2)
            
            logger.info(f"Index data saved to {self.index_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving index data: {str(e)}")
            return False
    
    def build_index(self):
        """Build the RAG index with minimal memory usage"""
        # Check if documents directory exists
        if not os.path.exists(self.documents_dir):
            logger.error(f"Documents directory {self.documents_dir} not found")
            return False
        
        # Get document files
        document_files = glob.glob(os.path.join(self.documents_dir, "**"), recursive=True)
        document_files = [f for f in document_files if os.path.isfile(f)]
        
        if not document_files:
            logger.error(f"No documents found in {self.documents_dir}")
            return False
        
        logger.info(f"Found {len(document_files)} documents")
        
        # Process documents one by one
        for doc_idx, doc_path in enumerate(document_files):
            success = self.process_single_document(doc_path, doc_idx)
            if not success:
                logger.warning(f"Skipping document {doc_path} due to processing error")
                continue
            
            # Force garbage collection
            gc.collect()
        
        # Load embedding model if not already loaded
        if self.embedding_model is None:
            if not self.load_embedding_model():
                return False
        
        # Process chunks in tiny batches to minimize memory usage
        logger.info(f"Creating embeddings for {len(self.document_chunks)} chunks in batches of {self.batch_size}")
        
        all_embeddings = []
        for i in range(0, len(self.document_chunks), self.batch_size):
            batch = self.document_chunks[i:i+self.batch_size]
            logger.info(f"Processing batch {i//self.batch_size + 1}/{(len(self.document_chunks)+self.batch_size-1)//self.batch_size}")
            
            try:
                # Create embeddings for this batch
                batch_embeddings = self.embedding_model.encode(batch, show_progress_bar=False)
                all_embeddings.append(batch_embeddings)
                logger.info(f"Batch {i//self.batch_size + 1} processed")
                
                # Force garbage collection after each batch
                gc.collect()
            except Exception as e:
                logger.error(f"Error creating embeddings for batch {i//self.batch_size + 1}: {str(e)}")
                return False
        
        # Combine all embeddings
        try:
            logger.info("Combining all embeddings")
            combined_embeddings = np.vstack(all_embeddings)
            
            # Save embeddings
            logger.info(f"Saving embeddings to {self.embeddings_path}")
            np.save(self.embeddings_path, combined_embeddings)
            
            # Save index data
            if not self.save_index_data():
                return False
            
            logger.info(f"RAG index created successfully with {len(self.document_chunks)} chunks from {len(document_files)} documents")
            return True
            
        except Exception as e:
            logger.error(f"Error in final processing: {str(e)}")
            return False

def main():
    # Get current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Set paths 
    documents_dir = os.path.join(current_dir, "documents")
    embeddings_dir = os.path.join(current_dir, "embeddings")
    
    # Log memory information
    try:
        import psutil
        mem = psutil.virtual_memory()
        logger.info(f"Available memory: {mem.available / (1024 * 1024):.2f} MB")
        
        # Set even smaller chunk size if very low memory
        chunk_size = 128 if mem.available < 500 * 1024 * 1024 else 256
        batch_size = 2 if mem.available < 500 * 1024 * 1024 else 3
        
        logger.info(f"Using chunk_size={chunk_size} and batch_size={batch_size}")
    except ImportError:
        logger.warning("psutil not available, using default settings")
        chunk_size = 256
        batch_size = 3
    
    # Build the index
    builder = TinyRAGBuilder(
        documents_dir=documents_dir,
        embeddings_dir=embeddings_dir,
        chunk_size=chunk_size,
        chunk_overlap=32,  # Very small overlap
        batch_size=batch_size
    )
    
    success = builder.build_index()
    
    if success:
        print("RAG index created successfully!")
    else:
        print("Failed to create RAG index. Check tiny_rag.log for details.")

if __name__ == "__main__":
    main() 