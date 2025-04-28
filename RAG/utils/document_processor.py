import os
import re
import json
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

class DocumentProcessor:
    """
    Processes documents for the RAG system
    """
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 128):
        """
        Initialize the document processor
        
        Args:
            chunk_size (int): Size of each document chunk in characters
            chunk_overlap (int): Overlap between consecutive chunks in characters
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def split_text(self, text: str) -> List[str]:
        """
        Split a document into chunks
        
        Args:
            text (str): Document text to split
            
        Returns:
            List[str]: List of text chunks
        """
        # Simple chunk-based splitting
        chunks = []
        
        if len(text) <= self.chunk_size:
            chunks.append(text)
        else:
            start = 0
            while start < len(text):
                end = min(start + self.chunk_size, len(text))
                
                # If we're not at the end and not at the beginning,
                # try to find a natural breakpoint like a newline or period
                if end < len(text) and start > 0:
                    # Look for paragraph break
                    paragraph_break = text.rfind('\n\n', start, end)
                    if paragraph_break != -1 and paragraph_break > start + self.chunk_size // 2:
                        end = paragraph_break + 2
                    else:
                        # Look for sentence break
                        sentence_break = text.rfind('. ', start, end)
                        if sentence_break != -1 and sentence_break > start + self.chunk_size // 2:
                            end = sentence_break + 2
                        else:
                            # Look for word break
                            word_break = text.rfind(' ', start, end)
                            if word_break != -1:
                                end = word_break + 1
                
                chunks.append(text[start:end].strip())
                start = end - self.chunk_overlap
                
        return chunks
    
    def process_document(self, file_path: str) -> Dict[str, Any]:
        """
        Process a document from disk
        
        Args:
            file_path (str): Path to the document
            
        Returns:
            Dict[str, Any]: Dictionary containing document metadata and chunks
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        file_name = os.path.basename(file_path)
        file_ext = os.path.splitext(file_name)[1].lower()
        
        # Handle different file types (simplified)
        # In a real application, you might want to use specialized parsers for different file types
        if file_ext in ['.md', '.txt', '.py', '.js', '.html']:
            text = content
        elif file_ext == '.json':
            # Try to stringify the JSON content
            try:
                data = json.loads(content)
                text = json.dumps(data, indent=2)
            except:
                text = content
        else:
            # Default to using the content as is
            text = content
            
        # Split the document into chunks
        chunks = self.split_text(text)
        
        return {
            "filename": file_name,
            "path": file_path,
            "chunks": chunks,
            "num_chunks": len(chunks)
        }
    
    def extract_metadata(self, text: str) -> Dict[str, Any]:
        """
        Extract metadata from document text
        
        Args:
            text (str): Document text
            
        Returns:
            Dict[str, Any]: Extracted metadata
        """
        metadata = {
            "word_count": len(text.split()),
            "char_count": len(text)
        }
        
        # Extract date patterns (very simplified)
        date_pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}'
        dates = re.findall(date_pattern, text)
        if dates:
            metadata["dates"] = dates
        
        return metadata 