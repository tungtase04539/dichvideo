# Backend Dockerfile for Railway/Render
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy pyvideotrans (for diarization module)
COPY ../pyvideotrans /app/pyvideotrans

# Copy application code
COPY . .

# Create temp directory
RUN mkdir -p /tmp/dichvideo

# Expose port (Railway sets PORT env var)
EXPOSE 8000

# Run the application
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
