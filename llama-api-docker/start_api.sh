#!/bin/bash

# Check if model exists
MODEL_DIR=${MODEL_DIR:-"./models_new/Llama-3.2-1B_new"}

if [ ! -d "$MODEL_DIR" ]; then
  echo "Error: Model directory $MODEL_DIR does not exist"
  echo "Please download the model first"
  exit 1
fi

# Launch the API server
echo "Starting API server with model from $MODEL_DIR"
python api_server.py 