\---

title: RAG Agent v3 Backend

emoji: 🤖

colorFrom: blue

colorTo: purple

sdk: docker

app\_port: 7860

pinned: false

license: mit

\---



\# RAG Agent v3 — Backend



FastAPI backend for the RAG Agent v3 full-stack project.



\## Stack

\- FastAPI + Uvicorn

\- ChromaDB vector store

\- Hybrid retrieval (BM25 + dense embeddings)

\- Cross-encoder reranker

\- Groq Llama-3.1-8b-instant

\- Server-Sent Events (SSE) streaming



\## Endpoints

\- `GET /` — service info

\- `GET /health` — health check

\- `GET /docs` — Swagger UI

\- `POST /chat` — non-streaming RAG

\- `POST /chat/stream` — SSE streaming RAG



\## Repo

Source: https://github.com/king-of-codeing/rag-agent-v3

