"""
Process a single document with the TinyDocumentProcessor
Useful for testing and debugging specific problematic documents
"""
import os
import sys
import argparse
import logging
from utils.tiny_document_processor import TinyDocumentProcessor

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("document_processing.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("DocumentProcessor")

def process_document(doc_path, chunk_size=128, chunk_overlap=32):
    """Process a single document with detailed logging"""
    if not os.path.exists(doc_path):
        logger.error(f"Document not found: {doc_path}")
        return False
    
    logger.info(f"Processing document: {doc_path}")
    logger.info(f"Using chunk_size={chunk_size}, chunk_overlap={chunk_overlap}")
    
    # Get document size
    try:
        doc_size = os.path.getsize(doc_path)
        logger.info(f"Document size: {doc_size} bytes")
    except Exception as e:
        logger.warning(f"Could not get document size: {str(e)}")
    
    # Initialize processor
    processor = TinyDocumentProcessor(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )
    
    try:
        # Process document
        doc_data = processor.process_document(doc_path)
        
        # Log results
        logger.info(f"Document processed successfully")
        logger.info(f"Created {len(doc_data['chunks'])} chunks")
        
        # Log chunk info
        for i, chunk in enumerate(doc_data['chunks']):
            logger.info(f"Chunk {i}: {len(chunk)} characters")
        
        print(f"\nSuccessfully processed {doc_path}")
        print(f"Created {len(doc_data['chunks'])} chunks")
        print(f"See document_processing.log for details")
        
        return True
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        print(f"\nFailed to process document: {str(e)}")
        print("See document_processing.log for details")
        
        return False

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Process a single document with TinyDocumentProcessor")
    parser.add_argument("document", help="Path to the document to process")
    parser.add_argument("--chunk-size", type=int, default=128, help="Maximum size of each chunk in characters")
    parser.add_argument("--chunk-overlap", type=int, default=32, help="Overlap between consecutive chunks in characters")
    
    args = parser.parse_args()
    
    # Process document
    success = process_document(
        args.document,
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap
    )
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 