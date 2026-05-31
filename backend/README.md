---
title: RAG Agent v3 Backend
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# RAG Agent v3 - Backend

FastAPI backend for the RAG Agent v3 full-stack project.

## Stack
- FastAPI + Uvicorn
- ChromaDB vector store
- Hybrid retrieval (BM25 + dense embeddings)
- Cross-encoder reranker (ms-marco-MiniLM-L-6-v2)
- Groq Llama-3.1-8b-instant
- Server-Sent Events (SSE) streaming

## Endpoints
- GET / - service info
- GET /health - health check
- GET /docs - Swagger UI
- POST /chat - non-streaming RAG
- POST /chat/stream - SSE streaming RAG

## Source
https://github.com/king-of-codeing/rag-agent-v3