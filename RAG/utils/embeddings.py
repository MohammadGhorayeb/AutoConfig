import os
import numpy as np
import torch
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer

class EmbeddingModel:
    """
    Handles text embeddings for the RAG system using Sentence Transformers
    """
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the embedding model
        
        Args:
            model_name (str): Name of the model to use for embeddings
        """
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        
    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts (List[str]): List of text strings to embed
            
        Returns:
            np.ndarray: Numpy array of embeddings
        """
        return self.model.encode(texts, convert_to_numpy=True)
    
    def embed_query(self, query: str) -> np.ndarray:
        """
        Generate embedding for a single query text
        
        Args:
            query (str): Query text to embed
            
        Returns:
            np.ndarray: Numpy array containing the query embedding
        """
        return self.model.encode(query, convert_to_numpy=True)
    
    def similarity_search(self, query_embedding: np.ndarray, document_embeddings: np.ndarray, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Find the most similar documents to a query using cosine similarity
        
        Args:
            query_embedding (np.ndarray): Query embedding
            document_embeddings (np.ndarray): Document embeddings
            top_k (int): Number of results to return
            
        Returns:
            List[Dict[str, Any]]: List of dictionaries containing index and score
        """
        # Compute cosine similarity
        scores = np.dot(document_embeddings, query_embedding) / (
            np.linalg.norm(document_embeddings, axis=1) * np.linalg.norm(query_embedding)
        )
        
        # Get top-k results
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        return [
            {"index": int(idx), "score": float(scores[idx])}
            for idx in top_indices
        ]
    
    def save_embeddings(self, embeddings: np.ndarray, file_path: str) -> None:
        """
        Save embeddings to disk
        
        Args:
            embeddings (np.ndarray): Document embeddings
            file_path (str): Path to save the embeddings
        """
        np.save(file_path, embeddings)
    
    def load_embeddings(self, file_path: str) -> np.ndarray:
        """
        Load embeddings from disk
        
        Args:
            file_path (str): Path to load the embeddings from
            
        Returns:
            np.ndarray: Loaded embeddings
        """
        return np.load(file_path) 