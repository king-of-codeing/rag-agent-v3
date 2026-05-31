# RAG Agent v3 Backend — HuggingFace Spaces Docker SDK
# Python 3.11 slim for smaller image + sentence-transformers compatibility

FROM python:3.11-slim

# System packages needed by some Python wheels (sentence-transformers, chromadb)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# HuggingFace Spaces expects the app to run as a non-root user
# and writes to /code (HF convention) or /home/user/app
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Working directory inside the container
WORKDIR $HOME/app

# Copy requirements first — leverages Docker layer caching
COPY --chown=user:user requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY --chown=user:user . .

# Run ingestion at build time so ChromaDB is ready when the service starts
# (HF Spaces has persistent disk, so this index survives restarts)
RUN python ingest.py

# HF Spaces expects services on port 7860
EXPOSE 7860

# Use 0.0.0.0 so it listens on all interfaces
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]