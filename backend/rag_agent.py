"""
RAG agent v3.1 — adds two-stage retrieval with cross-encoder reranker.

Pipeline:
  query
    -> bi-encoder embed (MiniLM)
    -> top-20 candidates from ChromaDB
    -> cross-encoder rerank (BAAI/bge-reranker-base)
    -> top-5 best chunks
    -> Groq with citation-aware prompt
    -> { answer, sources }
"""
import os
from typing import List, Tuple, Dict
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from sentence_transformers import CrossEncoder

load_dotenv()

CHROMA_DIR = "chroma_db"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
RERANKER_MODEL = "BAAI/bge-reranker-base"
GROQ_MODEL = "llama-3.1-8b-instant"

# Two-stage retrieval knobs
FETCH_K = 20   # candidates pulled from ChromaDB (broad)
TOP_K = 5      # final chunks sent to LLM (narrow)

SYSTEM_PROMPT = """You are a precise document Q&A assistant.

RULES:
1. Answer ONLY using the numbered context snippets below.
2. Cite every factual claim inline using [1], [2], etc. matching the snippet number.
3. If multiple snippets support a claim, cite all of them like [1][3].
4. If the answer is not in the context, reply exactly:
   "I don't have enough information in the provided documents to answer that."
5. Be concise. Use bullet points for lists.
"""


class RAGAgent:
    def __init__(self):
        print("Loading embedding model...")
        self.embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)

        print("Loading vector store...")
        self.vectorstore = Chroma(
            persist_directory=CHROMA_DIR,
            embedding_function=self.embeddings,
        )
        # NOTE: we now fetch FETCH_K (20) candidates, not TOP_K (5)
        self.retriever = self.vectorstore.as_retriever(
            search_kwargs={"k": FETCH_K}
        )

        print(f"Loading reranker model ({RERANKER_MODEL})...")
        # First call downloads ~280MB; cached afterwards
        self.reranker = CrossEncoder(RERANKER_MODEL)

        print("Connecting to Groq...")
        self.llm = ChatGroq(
            model=GROQ_MODEL,
            temperature=0.2,
            api_key=os.getenv("GROQ_API_KEY"),
        )
        print("RAG agent ready (with reranker).")

    def _rerank(self, query: str, docs) -> list:
        """
        Score each (query, chunk) pair with the cross-encoder.
        Return docs sorted by score, truncated to TOP_K.
        """
        if not docs:
            return []

        # Build pairs in the order the reranker expects: [(query, passage), ...]
        pairs = [(query, d.page_content) for d in docs]
        scores = self.reranker.predict(pairs)  # numpy array of floats

        # Pair each doc with its score, sort descending, take top-K
        ranked = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)
        return [doc for doc, _score in ranked[:TOP_K]]

    def _format_context(self, docs) -> Tuple[str, List[Dict]]:
        context_lines = []
        sources = []
        for i, d in enumerate(docs, start=1):
            src = d.metadata.get("source", "unknown")
            page = d.metadata.get("page", "?")
            snippet = d.page_content.strip()
            context_lines.append(f"[{i}] (source: {src}, page: {page})\n{snippet}")
            sources.append({
                "id": i,
                "source": src,
                "page": page,
                "snippet": snippet[:300] + ("..." if len(snippet) > 300 else ""),
            })
        return "\n\n".join(context_lines), sources

    def ask(self, query: str) -> Dict:
        # Stage 1: broad retrieval (top-20 by embedding similarity)
        candidates = self.retriever.invoke(query)

        if not candidates:
            return {
                "answer": "I don't have enough information in the provided documents to answer that.",
                "sources": [],
            }

        # Stage 2: rerank with cross-encoder, keep top-5
        top_docs = self._rerank(query, candidates)

        # Stage 3: format context with numbered citations, call Groq
        context_block, sources = self._format_context(top_docs)
        user_msg = f"CONTEXT:\n{context_block}\n\nQUESTION: {query}\n\nANSWER (with [n] citations):"

        response = self.llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_msg),
        ])
        return {"answer": response.content, "sources": sources}


# Singleton: load models once, reuse across all requests
_agent = None
def get_agent() -> RAGAgent:
    global _agent
    if _agent is None:
        _agent = RAGAgent()
    return _agent