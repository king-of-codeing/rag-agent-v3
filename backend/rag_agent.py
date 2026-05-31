"""
RAG agent v3.2 — adds hybrid search (BM25 + dense) with RRF fusion,
keeps the cross-encoder reranker from v3.1.

Pipeline:
  query
    -> dense (MiniLM/ChromaDB) top-20  ─┐
                                         ├── RRF fusion → top-20
    -> sparse (BM25)            top-20  ─┘
    -> cross-encoder rerank → top-5
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

from hybrid_retriever import HybridRetriever

load_dotenv()

CHROMA_DIR = "chroma_db"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
RERANKER_MODEL = "BAAI/bge-reranker-base"
GROQ_MODEL = "llama-3.1-8b-instant"

FETCH_K = 20
TOP_K = 5

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

        print("Building hybrid retriever (dense + BM25)...")
        # Pull ALL chunks out of ChromaDB so BM25 can index them
        all_chunks = self._load_all_chunks()
        self.hybrid = HybridRetriever(
            vectorstore=self.vectorstore,
            chunks=all_chunks,
            fetch_k=FETCH_K,
        )
        print(f"Hybrid retriever ready over {len(all_chunks)} chunks.")

        print(f"Loading reranker model ({RERANKER_MODEL})...")
        self.reranker = CrossEncoder(RERANKER_MODEL)

        print("Connecting to Groq...")
        self.llm = ChatGroq(
            model=GROQ_MODEL,
            temperature=0.2,
            api_key=os.getenv("GROQ_API_KEY"),
        )
        print("RAG agent ready (hybrid + reranker).")

    def _load_all_chunks(self):
        """
        Pull all stored Documents out of the Chroma collection.
        Needed so BM25 can index the same corpus.
        """
        from langchain_core.documents import Document
        # Chroma's underlying collection lets us get everything
        raw = self.vectorstore.get()  # dict: ids, documents, metadatas
        return [
            Document(page_content=text, metadata=meta or {})
            for text, meta in zip(raw["documents"], raw["metadatas"])
        ]

    def _rerank(self, query: str, docs) -> list:
        if not docs:
            return []
        pairs = [(query, d.page_content) for d in docs]
        scores = self.reranker.predict(pairs)
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
        # Stage 1: hybrid retrieval (dense + BM25 + RRF)
        candidates = self.hybrid.retrieve(query)
        if not candidates:
            return {
                "answer": "I don't have enough information in the provided documents to answer that.",
                "sources": [],
            }

        # Stage 2: cross-encoder rerank → top-K
        top_docs = self._rerank(query, candidates)

        # Stage 3: format + call Groq
        context_block, sources = self._format_context(top_docs)
        user_msg = f"CONTEXT:\n{context_block}\n\nQUESTION: {query}\n\nANSWER (with [n] citations):"
        response = self.llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_msg),
        ])
        return {"answer": response.content, "sources": sources}


_agent = None
def get_agent() -> RAGAgent:
    global _agent
    if _agent is None:
        _agent = RAGAgent()
    return _agent