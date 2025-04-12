FROM python:3.9-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create rails directory
RUN mkdir -p /app/rails

# Copy the application code
COPY . .

# Ensure rails directory exists and has proper permissions
RUN mkdir -p /app/rails && chmod 777 /app/rails

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "generate_guard:app", "--host", "0.0.0.0", "--port", "8000"] 