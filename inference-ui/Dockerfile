FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=3000
ENV LLAMA_API_URL=http://llama-api:8000

EXPOSE 3000

CMD ["python", "app.py"] 