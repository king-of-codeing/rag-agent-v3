"""
FastAPI backend for RAG agent v3.3.

Endpoints:
  GET  /            - service info
  GET  /health      - health check
  POST /chat        - non-streaming RAG (legacy / fallback)
  POST /chat/stream - SSE streaming RAG (modern UI)
"""
import json
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Any

from rag_agent import get_agent
from ingest import ingest as run_ingest


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


app = FastAPI(
    title="RAG Agent v3 API",
    description="Production-grade RAG: hybrid search + reranker + streaming",
    version="3.3.0",
    lifespan=lifespan,
)

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


# ---------- Schemas ----------
class ChatRequest(BaseModel):
    query: str

class Source(BaseModel):
    id: int
    source: str
    page: Any
    snippet: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]


# ---------- Routes ----------
@app.get("/")
def root():
    return {
        "service": "RAG Agent v3",
        "version": "3.3.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "rag-agent-v3"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Non-streaming RAG. Returns the full answer at once."""
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        agent = get_agent()
        return agent.ask(req.query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG error: {str(e)}")


@app.post("/chat/stream")
def chat_stream(req: ChatRequest):
    """
    Streaming RAG via Server-Sent Events.

    Event protocol:
      event: sources    -> { "sources": [...] }   (sent once, before tokens)
      event: token      -> { "text": "..." }      (sent many times)
      event: done       -> { "finish_reason": "stop" }
      event: error      -> { "message": "..." }
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    def event_generator():
        try:
            agent = get_agent()
            for event in agent.ask_stream(req.query):
                etype = event["type"]
                edata = event["data"]
                if etype == "sources":
                    payload = json.dumps({"sources": edata})
                elif etype == "token":
                    payload = json.dumps({"text": edata})
                elif etype == "done":
                    payload = json.dumps(edata)
                elif etype == "error":
                    payload = json.dumps({"message": edata})
                else:
                    continue
                # SSE wire format: "event: <name>\ndata: <json>\n\n"
                yield f"event: {etype}\ndata: {payload}\n\n"
        except Exception as e:
            err = json.dumps({"message": f"Server error: {str(e)}"})
            yield f"event: error\ndata: {err}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable proxy buffering (useful in prod)
        },
    )