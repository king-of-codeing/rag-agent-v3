"""
FastAPI backend for RAG agent v3.5.

Endpoints:
  GET    /             - service info
  GET    /health       - health check
  POST   /chat         - non-streaming RAG (legacy / fallback)
  POST   /chat/stream  - SSE streaming RAG
  GET    /docs/list    - list indexed documents
  POST   /upload       - upload + re-ingest a new document
  DELETE /docs/{name}  - delete + re-ingest after removal
"""
import os
import json
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Any

from rag_agent import get_agent
from ingest import ingest as run_ingest


# ---------- Constants ----------
DOCS_DIR = Path("docs")
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".markdown"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ---------- Lifecycle: ingest + eager-load on startup ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    if not Path("chroma_db").exists() or not any(Path("chroma_db").iterdir()):
        print("No ChromaDB index found - running ingestion...")
        run_ingest()
    else:
        print("ChromaDB index found - skipping ingestion")

    print("Pre-loading RAG agent (this is the slow part)...")
    _ = get_agent()
    print("Backend ready to serve requests!")

    yield
    print("Backend shutting down...")


# ---------- FastAPI app ----------
app = FastAPI(
    title="RAG Agent v3 API",
    description="Production-grade RAG: hybrid search + reranker + streaming + uploads",
    version="3.5.0",
    lifespan=lifespan,
)


# ---------- CORS: allow local dev + production frontends ----------
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    ALLOWED_ORIGINS.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.(vercel\.app|hf\.space|huggingface\.co)",
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


# ---------- Core routes ----------
@app.get("/")
def root():
    return {
        "service": "RAG Agent v3",
        "version": "3.5.0",
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
                yield f"event: {etype}\ndata: {payload}\n\n"
        except Exception as e:
            err = json.dumps({"message": f"Server error: {str(e)}"})
            yield f"event: error\ndata: {err}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------- Document management endpoints ----------

@app.get("/docs/list")
def list_docs():
    """Return all currently indexed documents in docs/."""
    if not DOCS_DIR.exists():
        return {"documents": []}
    docs = []
    for f in sorted(DOCS_DIR.iterdir()):
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS:
            docs.append({
                "name": f.name,
                "size": f.stat().st_size,
            })
    return {"documents": docs}


@app.post("/upload")
async def upload_doc(file: UploadFile = File(...)):
    """
    Accept a document upload, save to docs/, and re-ingest the corpus.
    Returns when ingestion is complete (synchronous for simplicity).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    safe_name = Path(file.filename).name  # prevent path traversal
    suffix = Path(safe_name).suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large (max {MAX_FILE_SIZE // 1024 // 1024} MB)",
        )

    DOCS_DIR.mkdir(exist_ok=True)
    dest = DOCS_DIR / safe_name
    with open(dest, "wb") as f:
        f.write(content)

    try:
        run_ingest()
        get_agent().refresh_corpus()
    except Exception as e:
        # Roll back: remove the file we just saved if ingestion failed
        try:
            dest.unlink()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

    return {
        "status": "indexed",
        "filename": safe_name,
        "size": len(content),
    }


@app.delete("/docs/{filename}")
def delete_doc(filename: str):
    """Delete a document and re-ingest the remaining corpus."""
    safe_name = Path(filename).name
    file_path = DOCS_DIR / safe_name

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"Document not found: {safe_name}")

    file_path.unlink()

    try:
        run_ingest()
        get_agent().refresh_corpus()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Re-ingestion failed: {str(e)}")

    return {"status": "deleted", "filename": safe_name}