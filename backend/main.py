"""
FastAPI backend for RAG agent v3.

Exposes the RAG logic as HTTP endpoints that the React frontend can call.
"""
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from rag_agent import get_agent
from ingest import ingest as run_ingest


# ---------- Lifecycle: auto-ingest on startup if index missing ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    if not Path("chroma_db").exists() or not any(Path("chroma_db").iterdir()):
        print("No ChromaDB index found - running ingestion...")
        run_ingest()
    else:
        print("ChromaDB index found - skipping ingestion")
    print("Backend ready to serve requests!")
    yield
    print("Backend shutting down...")


# ---------- FastAPI app ----------
app = FastAPI(
    title="RAG Agent v3 API",
    description="Production-grade RAG with citations",
    version="3.0.0",
    lifespan=lifespan,
)


# ---------- CORS: allow React frontend to call this backend ----------
# Vite dev server runs on http://localhost:5173 by default
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Request/Response schemas ----------
# Pydantic models = automatic validation + auto-generated API docs
class ChatRequest(BaseModel):
    query: str

class Source(BaseModel):
    id: int
    source: str
    page: Any  # could be int or "?" string
    snippet: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]


# ---------- Endpoints ----------
@app.get("/")
def root():
    """Friendly landing page when someone hits the root URL."""
    return {
        "service": "RAG Agent v3",
        "version": "3.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    """Health check - frontend can call this to verify backend is alive."""
    return {"status": "ok", "service": "rag-agent-v3"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    Main RAG endpoint.
    Input:  { "query": "your question" }
    Output: { "answer": "...[1]...", "sources": [{...}, ...] }
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        agent = get_agent()
        result = agent.ask(req.query)
        return result
    except Exception as e:
        # In production we'd log this properly; for now just surface the error
        raise HTTPException(status_code=500, detail=f"RAG error: {str(e)}")