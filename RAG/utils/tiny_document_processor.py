"""
Super memory-efficient document processor that handles files line by line
"""
import os
import logging

logger = logging.getLogger(__name__)

class TinyDocumentProcessor:
    """Processes documents into chunks with minimal memory usage"""
    
    def __init__(self, chunk_size=512, chunk_overlap=128):
        """
        Initialize the document processor
        
        Args:
            chunk_size (int): Maximum size of each chunk in characters
            chunk_overlap (int): Overlap between consecutive chunks in characters
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def process_document(self, file_path):
        """
        Process a document into chunks with minimal memory usage
        
        Args:
            file_path (str): Path to the document file
            
        Returns:
            dict: Document data including chunks
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document not found: {file_path}")
        
        filename = os.path.basename(file_path)
        logger.info(f"Processing document: {filename}")
        
        # Process the file line by line to avoid loading the entire file into memory
        chunks = []
        current_chunk = ""
        
        try:
            # Read the file line by line
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    # Add the line to the current chunk
                    if len(current_chunk) + len(line) <= self.chunk_size:
                        current_chunk += line
                    else:
                        # If adding the line would exceed chunk_size, save the current chunk
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                        
                        # Start a new chunk with overlap
                        if len(current_chunk) > self.chunk_overlap:
                            # Get the last part of the current chunk for overlap
                            overlap_text = current_chunk[-self.chunk_overlap:]
                            current_chunk = overlap_text + line
                        else:
                            # If the current chunk is smaller than the overlap, just use it all
                            current_chunk = current_chunk + line
            
            # Add the last chunk if not empty
            if current_chunk:
                chunks.append(current_chunk.strip())
            
            logger.info(f"Document {filename} split into {len(chunks)} chunks")
            
            return {
                "filename": filename,
                "path": file_path,
                "num_chunks": len(chunks),
                "chunks": chunks
            }
            
        except Exception as e:
            logger.error(f"Error processing document {file_path}: {str(e)}")
            raise 