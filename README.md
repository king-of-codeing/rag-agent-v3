\# RAG Agent v3 — Full-Stack Production RAG



A production-grade Retrieval-Augmented Generation (RAG) agent with a custom React frontend and FastAPI backend.



\## 🚀 Live Demo



| Service | URL | Hosted on |

|---|---|---|

| \*\*Frontend\*\* (React + Vite + Tailwind) | https://rag-agent-v3.vercel.app | Vercel |

| \*\*Backend\*\* (FastAPI + Docker) | https://anothercoder-rag-agent-v3-backend.hf.space | HuggingFace Spaces |

| \*\*API Docs\*\* (Swagger UI) | https://anothercoder-rag-agent-v3-backend.hf.space/docs | HuggingFace Spaces |

| \*\*Source code\*\* | https://github.com/king-of-codeing/rag-agent-v3 | GitHub |



\## Architecture
React + Vite + Tailwind  ←─ SSE ─→  FastAPI + Docker  ←─→  Hybrid Retrieval

(Vercel CDN)                     (HF Spaces, 16 GB)        (BM25 + dense + RRF)

↓

Cross-encoder reranker

↓

Groq Llama-3.1-8b (streaming)


## Stack



| Layer | Tech | Why |

|---|---|---|

| Frontend | React 19 + Vite 8 + Tailwind v4 | Modern, fast, industry-standard |

| Backend | FastAPI + Uvicorn + Pydantic | Native async + auto-generated OpenAPI |

| Container | Docker (Python 3.11-slim) | Portable, reproducible deploys |

| Embeddings | `BAAI/bge-small-en-v1.5` | Best free recall, 384-dim, CPU-friendly |

| Vector store | ChromaDB | Embedded, no infra |

| Sparse retrieval | BM25 (`rank-bm25`) | Catches keyword matches embeddings miss |

| Fusion | Reciprocal Rank Fusion (RRF) | Parameter-light, robust (Cormack et al., 2009) |

| Reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Two-stage retrieval, tiny memory footprint |

| LLM | Groq Llama-3.1-8b-instant | Fastest free inference (\~500 tok/s) |

| Streaming | Server-Sent Events (SSE) | Token-by-token UX |



\## Features



\- ✅ \*\*Hybrid retrieval\*\* — dense + sparse search with RRF fusion

\- ✅ \*\*Two-stage reranking\*\* — retrieve top-20, rerank to top-5 via cross-encoder

\- ✅ \*\*Citation-grounded answers\*\* — every claim cites `\[n]` to numbered source

\- ✅ \*\*Streaming responses\*\* — tokens stream live over SSE, ChatGPT-like UX

\- ✅ \*\*Source attribution\*\* — expandable cards show doc name, page, snippet

\- ✅ \*\*Grounded refusal\*\* — declines out-of-scope questions instead of hallucinating

\- ✅ \*\*CORS-secured\*\* — production frontend allowlist

\- ✅ \*\*Auto-deploy\*\* — git push triggers redeploys on both Vercel + HF Spaces



