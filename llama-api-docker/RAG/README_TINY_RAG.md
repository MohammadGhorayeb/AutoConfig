# Memory-Efficient RAG System

This is a lightweight implementation of the RAG (Retrieval-Augmented Generation) system designed to work with minimal memory usage. It's ideal for systems with limited resources or when processing large documents.

## Key Features

- **Ultra-efficient memory usage**: Processes documents line by line without loading entire files into memory
- **Batch processing**: Creates embeddings in small batches to minimize memory consumption
- **Adaptive parameters**: Automatically adjusts chunk size and batch size based on available system memory
- **Robust error handling**: Detailed logging and graceful error recovery
- **Diagnostic tools**: Specialized scripts for testing and debugging individual components

## Prerequisites

- Python 3.6+
- Required packages:
  - sentence-transformers
  - numpy
  - psutil (for memory monitoring)

The scripts will attempt to install missing packages automatically.

## Usage

### 1. Process a Single Document (for testing)

To test if a specific document can be processed without errors:

```
python process_single_document.py path/to/your/document.txt
```

Options:
- `--chunk-size` - Size of text chunks (default: 128)
- `--chunk-overlap` - Overlap between chunks (default: 32)

### 2. Build the RAG Index

To create the complete RAG index with all documents:

```
python run_tiny_rag.py
```

This will:
1. Load documents from the `documents` directory
2. Process each document into chunks
3. Create embeddings for each chunk
4. Save the index and embeddings to the `embeddings` directory

### 3. Run the RAG system

After building the index, run the regular RAG server which will use the created embeddings.

## Troubleshooting

### Memory Errors

If you encounter memory errors:

1. Try processing problematic documents individually first:
   ```
   python process_single_document.py documents/problematic_file.txt --chunk-size 64 --chunk-overlap 16
   ```

2. Reduce parameters in the RAG builder:
   - Edit `tiny_rag_builder.py` to use smaller chunk_size and batch_size
   - Lower values mean less memory usage but may affect quality

### Detailed Logs

Check these log files for detailed information:
- `tiny_rag.log` - Main RAG builder log
- `document_processing.log` - Single document processor log

## Files

- `tiny_document_processor.py` - Memory-efficient document processor
- `tiny_rag_builder.py` - Main RAG index builder
- `run_tiny_rag.py` - Runner script with error handling
- `process_single_document.py` - Tool for testing individual documents 