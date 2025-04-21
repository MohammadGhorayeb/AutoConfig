import os
import json
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import glob
from dotenv import load_dotenv

from utils.embeddings import EmbeddingModel
from utils.document_processor import DocumentProcessor

# Load environment variables
load_dotenv()

class RAGSystem:
    """
    Retrieval-Augmented Generation system for enhancing LLM responses with relevant document context
    """
    def __init__(
        self,
        documents_dir: str = "./documents",
        embeddings_dir: str = "./embeddings",
        embedding_model_name: str = "all-MiniLM-L6-v2",
        chunk_size: int = 512,
        chunk_overlap: int = 128,
        top_k: int = 5
    ):
        """
        Initialize the RAG system
        
        Args:
            documents_dir (str): Directory containing documents
            embeddings_dir (str): Directory to store embeddings
            embedding_model_name (str): Name of the embedding model to use
            chunk_size (int): Size of each document chunk in characters
            chunk_overlap (int): Overlap between consecutive chunks
            top_k (int): Number of relevant chunks to retrieve
        """
        # Create directories if they don't exist
        self.documents_dir = documents_dir
        self.embeddings_dir = embeddings_dir
        
        if not os.path.exists(documents_dir):
            os.makedirs(documents_dir)
            
        if not os.path.exists(embeddings_dir):
            os.makedirs(embeddings_dir)
        
        # Initialize components
        self.embedding_model = EmbeddingModel(model_name=embedding_model_name)
        self.document_processor = DocumentProcessor(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        
        # Settings
        self.top_k = top_k
        
        # Storage for document data
        self.document_chunks = []  # List of all document chunks
        self.document_metadata = []  # Metadata for each document
        self.chunk_embeddings = None  # Will be loaded or computed
        self.document_index = {}  # Maps chunk indices to document indices
        
        # Load existing index if available
        self.index_path = os.path.join(embeddings_dir, "rag_index.json")
        if os.path.exists(self.index_path):
            self.load_index()
    
    def create_index(self) -> None:
        """
        Create an index of all documents in the documents directory
        """
        print(f"Creating RAG index from documents in {self.documents_dir}")
        
        # Process all documents
        document_files = glob.glob(os.path.join(self.documents_dir, "**"), recursive=True)
        document_files = [f for f in document_files if os.path.isfile(f)]
        
        self.document_chunks = []
        self.document_metadata = []
        self.document_index = {}
        
        # Process each document
        for doc_idx, doc_path in enumerate(document_files):
            try:
                # Process document
                doc_data = self.document_processor.process_document(doc_path)
                
                # Add document metadata
                self.document_metadata.append({
                    "filename": doc_data["filename"],
                    "path": doc_data["path"],
                    "doc_index": doc_idx,
                    "num_chunks": doc_data["num_chunks"]
                })
                
                # Add chunks and update index
                for chunk_idx, chunk in enumerate(doc_data["chunks"]):
                    global_chunk_idx = len(self.document_chunks)
                    self.document_chunks.append(chunk)
                    self.document_index[global_chunk_idx] = {
                        "doc_idx": doc_idx,
                        "chunk_idx": chunk_idx
                    }
                
                print(f"Processed document: {doc_data['filename']} - {doc_data['num_chunks']} chunks")
            except Exception as e:
                print(f"Error processing document {doc_path}: {str(e)}")
        
        # Create embeddings for all chunks
        if self.document_chunks:
            print(f"Creating embeddings for {len(self.document_chunks)} chunks...")
            self.chunk_embeddings = self.embedding_model.embed_texts(self.document_chunks)
            
            # Save embeddings
            embeddings_path = os.path.join(self.embeddings_dir, "chunk_embeddings.npy")
            self.embedding_model.save_embeddings(self.chunk_embeddings, embeddings_path)
            
            # Save index mapping
            with open(self.index_path, 'w') as f:
                index_data = {
                    "metadata": self.document_metadata,
                    "document_index": self.document_index,
                    "embedding_model": self.embedding_model.model_name,
                    "chunk_size": self.document_processor.chunk_size,
                    "chunk_overlap": self.document_processor.chunk_overlap,
                    "num_chunks": len(self.document_chunks)
                }
                json.dump(index_data, f, indent=2)
            
            print(f"RAG index created successfully with {len(self.document_chunks)} chunks from {len(document_files)} documents")
        else:
            print("No documents found or processed")
    
    def load_index(self) -> None:
        """
        Load the existing index from disk
        """
        print("Loading existing RAG index...")
        
        try:
            # Load index mapping
            with open(self.index_path, 'r') as f:
                index_data = json.load(f)
            
            self.document_metadata = index_data["metadata"]
            self.document_index = {int(k): v for k, v in index_data["document_index"].items()}
            
            # Verify embedding model compatibility
            if index_data.get("embedding_model") != self.embedding_model.model_name:
                print(f"Warning: Current embedding model ({self.embedding_model.model_name}) differs from the one used to create the index ({index_data.get('embedding_model')})")
                
            # Load embeddings
            embeddings_path = os.path.join(self.embeddings_dir, "chunk_embeddings.npy")
            if os.path.exists(embeddings_path):
                self.chunk_embeddings = self.embedding_model.load_embeddings(embeddings_path)
                
                # Verify dimensions
                if self.chunk_embeddings.shape[0] != index_data.get("num_chunks", 0):
                    print(f"Warning: Number of embeddings ({self.chunk_embeddings.shape[0]}) doesn't match number of chunks in index ({index_data.get('num_chunks', 0)})")
            else:
                print(f"Error: Embeddings file not found at {embeddings_path}")
                self.chunk_embeddings = None
            
            # Load document chunks
            self.document_chunks = []
            for doc_meta in self.document_metadata:
                try:
                    doc_data = self.document_processor.process_document(doc_meta["path"])
                    self.document_chunks.extend(doc_data["chunks"])
                except Exception as e:
                    print(f"Error loading document {doc_meta['path']}: {str(e)}")
            
            print(f"RAG index loaded successfully with {len(self.document_chunks)} chunks from {len(self.document_metadata)} documents")
            
        except Exception as e:
            print(f"Error loading RAG index: {str(e)}")
            # Initialize empty
            self.document_chunks = []
            self.document_metadata = []
            self.document_index = {}
            self.chunk_embeddings = None
    
    def add_document(self, doc_path: str) -> bool:
        """
        Add a single document to the index
        
        Args:
            doc_path (str): Path to the document
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Process document
            doc_data = self.document_processor.process_document(doc_path)
            
            # Get document metadata
            doc_idx = len(self.document_metadata)
            doc_metadata = {
                "filename": doc_data["filename"],
                "path": doc_data["path"],
                "doc_index": doc_idx,
                "num_chunks": doc_data["num_chunks"]
            }
            
            # Create embeddings for the chunks
            new_chunk_embeddings = self.embedding_model.embed_texts(doc_data["chunks"])
            
            # Update storage
            self.document_metadata.append(doc_metadata)
            
            # Update document index
            start_chunk_idx = len(self.document_chunks)
            for chunk_idx, chunk in enumerate(doc_data["chunks"]):
                global_chunk_idx = start_chunk_idx + chunk_idx
                self.document_chunks.append(chunk)
                self.document_index[global_chunk_idx] = {
                    "doc_idx": doc_idx,
                    "chunk_idx": chunk_idx
                }
            
            # Update embeddings
            if self.chunk_embeddings is None:
                self.chunk_embeddings = new_chunk_embeddings
            else:
                self.chunk_embeddings = np.vstack([self.chunk_embeddings, new_chunk_embeddings])
            
            # Save updated embeddings
            embeddings_path = os.path.join(self.embeddings_dir, "chunk_embeddings.npy")
            self.embedding_model.save_embeddings(self.chunk_embeddings, embeddings_path)
            
            # Save updated index
            with open(self.index_path, 'w') as f:
                index_data = {
                    "metadata": self.document_metadata,
                    "document_index": self.document_index,
                    "embedding_model": self.embedding_model.model_name,
                    "chunk_size": self.document_processor.chunk_size,
                    "chunk_overlap": self.document_processor.chunk_overlap,
                    "num_chunks": len(self.document_chunks)
                }
                json.dump(index_data, f, indent=2)
            
            print(f"Added document: {doc_data['filename']} with {doc_data['num_chunks']} chunks")
            return True
            
        except Exception as e:
            print(f"Error adding document {doc_path}: {str(e)}")
            return False
    
    def retrieve(self, query: str) -> List[Dict[str, Any]]:
        """
        Retrieve relevant document chunks for a query
        
        Args:
            query (str): User query
            
        Returns:
            List[Dict[str, Any]]: List of relevant chunks with metadata
        """
        if not self.document_chunks or self.chunk_embeddings is None:
            print("No documents indexed. Please create an index first.")
            return []
        
        # Embed the query
        query_embedding = self.embedding_model.embed_query(query)
        
        # Find similar chunks
        similar_chunks = self.embedding_model.similarity_search(
            query_embedding, 
            self.chunk_embeddings, 
            top_k=self.top_k
        )
        
        # Fetch the chunk text and metadata
        results = []
        for item in similar_chunks:
            chunk_idx = item["index"]
            
            if chunk_idx < len(self.document_chunks):
                chunk_text = self.document_chunks[chunk_idx]
                
                # Get document metadata
                if chunk_idx in self.document_index:
                    doc_idx = self.document_index[chunk_idx]["doc_idx"]
                    if doc_idx < len(self.document_metadata):
                        doc_metadata = self.document_metadata[doc_idx]
                        
                        results.append({
                            "chunk": chunk_text,
                            "score": item["score"],
                            "document": doc_metadata["filename"],
                            "path": doc_metadata["path"]
                        })
        
        return results
    
    def generate_prompt(self, query: str, results: List[Dict[str, Any]]) -> str:
        """
        Generate a prompt with retrieved context for the LLM
        
        Args:
            query (str): User query
            results (List[Dict[str, Any]]): Retrieved chunks
            
        Returns:
            str: Prompt with context for the LLM
        """
        prompt = "You are an AI assistant for AutoConfig company. Answer questions based only on the following information:\n\n"
        
        # Add retrieved context
        if results:
            for i, result in enumerate(results):
                prompt += f"Document: {result['document']}\n{result['chunk']}\n\n"
        
        # Add the user's question in a clear, simple format
        prompt += f"Question: {query}\n\n"
        prompt += "Answer:"
        
        return prompt
    
    def augment_query(self, query: str) -> str:
        """
        Augment a user query with relevant document context
        
        Args:
            query (str): User query
            
        Returns:
            str: Augmented prompt for the LLM
        """
        # Retrieve relevant chunks
        results = self.retrieve(query)
        
        # Generate prompt with context
        if results:
            prompt = self.generate_prompt(query, results)
        else:
            prompt = f"User question: {query}\n\n"
            prompt += "Answer the question based on your knowledge. Be honest if you don't know the answer."
        
        return prompt 