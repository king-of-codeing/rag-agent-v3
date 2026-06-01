<div align="center">

# 🤖 RAG Agent v3

### Production-Grade Retrieval-Augmented Generation with Hybrid Search, Reranking, Streaming, and File Upload

[![Live Demo](https://img.shields.io/badge/Live-rag--agent--v3.vercel.app-6366f1?style=for-the-badge)](https://rag-agent-v3.vercel.app)
[![Backend API](https://img.shields.io/badge/API-HF%20Spaces-FFD700?style=for-the-badge)](https://anothercoder-rag-agent-v3-backend.hf.space)
[![Eval Score](https://img.shields.io/badge/Eval-17%2F17%20passing-22c55e?style=for-the-badge)](#-evaluation)

**A full-stack RAG agent that delivers Databricks Agent Bricks-level capability on free infrastructure.**

</div>

---

## ✨ What It Does

Ask a question, get a streaming answer **grounded in your documents** with inline citations. Upload new documents on the fly. Measured quality on a 17-case golden test set.

> **"How many days of annual leave do employees get?"**
> Annual leave is 24 days [1] and unused leave (up to 5 days) can be carried over [1].
>
> _Sources: company_policy.txt · page 1_

---

## 🎯 Highlights

| | |
|---|---|
| 🧠 **Hybrid retrieval** | Dense (BGE-small) + sparse (BM25) fused via Reciprocal Rank Fusion |
| 🎯 **Two-stage ranking** | Cross-encoder reranker (BAAI/bge-reranker-base) for top-K refinement |
| ⚡ **Streaming responses** | SSE token-by-token delivery — feels instant |
| 📚 **Live uploads** | Drag-and-drop PDF / TXT / MD, indexed on the fly |
| ✅ **Measurable quality** | Custom eval harness with golden Q&A (17/17 passing) |
| 🎨 **Modern UI** | Dark sidebar, gradient brand, citation badges, keyboard shortcuts |
| 🌐 **Production deployed** | Vercel + HuggingFace Spaces Docker, free tier |

---

## 🏛️ Architecture

```
┌────────────┬──────────────────────────────────────────────────┐
│            │                                                  │
│  Sidebar   │                  Main Chat                       │
│            │                                                  │
│  Brand     │   User → "How do I work from home?"             │
│  Stats     │                                                  │
│  Prompts   │   ✦ Streaming response                            │
│            │     with inline [1] [2] citations                │
│  React +   │                                                  │
│  Vite +    │   Sources: company_policy.txt · it_faq.md       │
│  Tailwind  │                                                  │
│  on Vercel │   ┌──────────────────────────────┐               │
│            │   │ Ask anything...        Send  │               │
│            │   └──────────────────────────────┘               │
└────────────┴──────────────────────────────────────────────────┘
                              │ HTTPS + SSE
                              ▼
              ┌──────────────────────────────┐
              │  FastAPI + Docker            │
              │  on HuggingFace Spaces       │
              ├──────────────────────────────┤
              │  1. Hybrid retrieve top-20   │
              │     BM25 + dense → RRF       │
              │  2. Cross-encoder rerank → 5 │
              │  3. Format grounded prompt   │
              │  4. Groq Llama-3.1-8b stream │
              └──────────────────────────────┘
```

---

## 🛠️ Stack

### Frontend (Vercel)
- **React 19** + **Vite 8** + **Tailwind CSS v4**
- SSE consumer for live token streaming
- Citation badge rendering (auto-parses `[n]` markers)
- Keyboard shortcuts (⌘J, ⌘K, ⌘/)

### Backend (HuggingFace Spaces Docker)
- **FastAPI** + **Uvicorn** + **Pydantic**
- **ChromaDB** (persistent vector store)
- **BAAI/bge-small-en-v1.5** (embeddings)
- **rank-bm25** (sparse retrieval)
- **BAAI/bge-reranker-base** (cross-encoder reranking)
- **Groq Llama-3.1-8b-instant** (generator)
- SSE streaming via `StreamingResponse`

### Evaluation
- Custom golden Q&A test set (`backend/eval_dataset.json`)
- Two-dimensional scoring: retrieval accuracy + keyword coverage
- Markdown report output (`eval_report.md`)
- 17/17 passing on the current deployed corpus

---

## 🚀 Live Demo

| Service | URL |
|---|---|
| **Frontend** | https://rag-agent-v3.vercel.app |
| **Backend API** | https://anothercoder-rag-agent-v3-backend.hf.space |
| **Swagger docs** | https://anothercoder-rag-agent-v3-backend.hf.space/docs |

---

## 📚 Demo Knowledge Base

The deployed demo includes:
- HR policy handbook (leave, WFH, expenses, code of conduct)
- IT FAQs (passwords, VPN, laptops, software)
- SmartHub X1 product manual
- Information security handbook
- Platform API documentation
- New hire onboarding guide

You can also upload your own `.pdf`, `.txt`, or `.md` files via the UI for live indexing.

---

## 🧪 Evaluation

The eval harness runs against a hand-written 17-case golden test set covering:
- Single-document factual queries
- Multi-document reasoning
- Paraphrase robustness
- Natural conversational phrasing
- Section-specific lookups
- Specific value retrieval
- Out-of-scope grounded refusal

```bash
cd backend
python eval.py
```

```
==============================================================================
  RAG AGENT v3 — EVALUATION HARNESS  (17 test cases)
==============================================================================
  Retrieval accuracy : 17/17 (100.0%)
  Keyword coverage   : 17/17 (100.0%)
  Overall score      : 100.0%
==============================================================================
```

### Bug Catches (Real Engineering Moments)

The harness immediately surfaced two architectural bugs that manual UI testing missed:

1. **Mislabeled document** — A file had been silently overwritten with the wrong content during upload testing. Retrieval looked correct (right filename returned) but the content was wrong. The grounded LLM behavior masked the bug from manual tests.

2. **Silent markdown loader failure** — `UnstructuredMarkdownLoader` was failing to load `.md` files due to fragile dependencies. Ingestion logs said "success" but no chunks reached the index. Fixed by switching to `TextLoader` for markdown.

Measurement > vibes. 📊

---

## 🏃 Run Locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1   # Windows
# source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt

# Set your Groq API key
echo "GROQ_API_KEY=your_key_here" > .env

python ingest.py
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Run Evaluation

```bash
cd backend
python eval.py
# Generates eval_report.md
```

---

## 📡 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Service info |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger UI |
| `POST` | `/chat` | Non-streaming RAG (JSON in, JSON out) |
| `POST` | `/chat/stream` | SSE streaming RAG (token-by-token) |
| `GET` | `/docs/list` | List indexed documents |
| `POST` | `/upload` | Upload a document, auto-reindex |
| `DELETE` | `/docs/{filename}` | Delete a document, reindex |

### Example: Streaming chat

```bash
curl -N -X POST https://anothercoder-rag-agent-v3-backend.hf.space/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "How many leave days?"}'
```

```
event: sources
data: {"sources": [{"id": 1, "source": "company_policy.txt", "page": 1, ...}]}

event: token
data: {"text": "Annual"}

event: token
data: {"text": " leave"}

...

event: done
data: {"finish_reason": "stop"}
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘J` / `Ctrl+J` | New chat |
| `⌘K` / `Ctrl+K` | Open documents library |
| `⌘/` / `Ctrl+/` | Show keyboard shortcut hints |
| `Enter` | Send message |
| `Esc` | Close modal |

---

## 📊 Compared to Databricks Agent Bricks

| Capability | Agent Bricks | This Project |
|---|---|---|
| Document-grounded Q&A | ✓ Managed | ✓ Built |
| User-uploaded docs | ✓ | ✓ |
| Custom UI | Limited | ✓ Full control |
| Streaming responses | ✓ | ✓ SSE |
| REST API | ✓ | ✓ FastAPI + Swagger |
| Citation grounding | ✓ | ✓ Inline badges |
| Hybrid retrieval | Managed | ✓ BM25 + dense + RRF |
| Reranking | Managed | ✓ Cross-encoder |
| Quality measurement | ALHF loop | ✓ Custom eval harness |
| Cost | Premium workspace | Free |

The remaining gap (collaborative labeling, managed serving, autoscaling) is enterprise-platform scope, not core agent capability.

---

## 🗺️ Version History

| Version | Description |
|---|---|
| v1 | Gradio-based RAG demo over documents |
| v2 | Citation-focused upgrade with HF deployment |
| v3.0 | Full-stack MVP — React + FastAPI separation |
| v3.1 | Cross-encoder reranker (two-stage retrieval) |
| v3.2 | Hybrid search (BM25 + dense + RRF) |
| v3.3 | SSE streaming responses |
| v3.4 | Production deployment (HF Docker + Vercel) |
| v3.5 | File upload UI with live indexing |
| v3.6 | Custom evaluation harness (17/17 passing) |
| v3.7 | UI refresh — sidebar, gradient brand, citation badges, keyboard shortcuts |

---

## 📝 License

MIT

---

<div align="center">

Built by **[Navaneeth Balaji](https://github.com/king-of-codeing)**

Reach out: [LinkedIn](https://linkedin.com/in/navaneeth-balaji) · [GitHub](https://github.com/king-of-codeing)

</div>