"""
RAG agent v3.4.2 — hybrid retrieval + cross-encoder reranker + streaming,
with a hybrid personality prompt that handles greetings/small talk gracefully
while keeping strict citation grounding for factual document questions.

Pipeline:
  query
    -> dense (BGE-small/ChromaDB) top-20  ─┐
                                            ├── RRF fusion → top-20
    -> sparse (BM25)              top-20  ─┘
    -> cross-encoder rerank → top-5
    -> Groq with hybrid personality prompt
    -> { answer, sources }  OR  streamed tokens
"""
import os
from typing import List, Tuple, Dict, Iterator
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from sentence_transformers import CrossEncoder

from hybrid_retriever import HybridRetriever

load_dotenv()

CHROMA_DIR = "chroma_db"
EMBED_MODEL = "BAAI/bge-small-en-v1.5"
RERANKER_MODEL = "BAAI/bge-reranker-base"
GROQ_MODEL = "llama-3.1-8b-instant"

# Two-stage retrieval knobs
FETCH_K = 20   # candidates pulled from hybrid retrieval (broad)
TOP_K = 5      # final chunks sent to LLM (narrow)


SYSTEM_PROMPT = """You are a friendly document Q&A assistant.

GENERAL CHAT BEHAVIOR:
- If the user greets you (hi, hello, hey, good morning) or asks how you are,
  respond warmly in 1-2 sentences. Offer to help with the loaded documents.
- If the user asks who you are or what you can do, briefly explain you're a
  RAG assistant that answers questions about the loaded documents, with citations.
- For small talk or meta questions, be conversational and concise. Do not invent
  facts about the documents.

DOCUMENT Q&A BEHAVIOR:
- For factual questions, answer ONLY using the numbered context snippets below.
- Cite every factual claim inline using [1], [2], etc. matching the snippet number.
- If multiple snippets support a claim, cite all of them like [1][3].
- If a factual question's answer is not in the context, reply:
  "I don't have enough information in the provided documents to answer that.
   Try asking about leave policies, IT FAQs, product specs, security guidelines,
   API documentation, or onboarding."
- Be concise. Use bullet points for lists.

Always favor honesty over guessing. Never invent citations.
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
        print("RAG agent ready (hybrid + reranker + streaming).")

    def _load_all_chunks(self):
        """
        Pull all stored Documents out of the Chroma collection so BM25
        can index the same corpus the vector store sees.
        """
        from langchain_core.documents import Document
        raw = self.vectorstore.get()  # dict: ids, documents, metadatas
        return [
            Document(page_content=text, metadata=meta or {})
            for text, meta in zip(raw["documents"], raw["metadatas"])
        ]

    def _rerank(self, query: str, docs) -> list:
        """
        Cross-encoder reranks (query, chunk) pairs and returns the top-K
        documents by relevance score.
        """
        if not docs:
            return []
        pairs = [(query, d.page_content) for d in docs]
        scores = self.reranker.predict(pairs)
        ranked = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)
        return [doc for doc, _score in ranked[:TOP_K]]

    def _format_context(self, docs) -> Tuple[str, List[Dict]]:
        """
        Build the numbered context block sent to the LLM and a parallel
        list of source records returned to the frontend.
        """
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

    def _retrieve_and_format(self, query: str):
        """Shared retrieval logic used by both ask() and ask_stream()."""
        candidates = self.hybrid.retrieve(query)
        if not candidates:
            return None, None, None
        top_docs = self._rerank(query, candidates)
        context_block, sources = self._format_context(top_docs)
        return context_block, sources, top_docs

    def ask(self, query: str) -> Dict:
        """Non-streaming: full answer returned at once."""
        context_block, sources, _ = self._retrieve_and_format(query)

        # If no retrieval results, still let the LLM handle chat/greetings
        # via the system prompt; we just send empty context.
        if context_block is None:
            context_block = "(no relevant document snippets retrieved)"
            sources = []

        user_msg = (
            f"CONTEXT:\n{context_block}\n\n"
            f"QUESTION: {query}\n\n"
            f"ANSWER (with [n] citations if drawing on context):"
        )

        response = self.llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_msg),
        ])
        return {"answer": response.content, "sources": sources}

    def ask_stream(self, query: str) -> Iterator[Dict]:
        """
        Streaming generator. Yields dicts of shape:
          { "type": "sources", "data": [...] }     # once, first
          { "type": "token",   "data": "text..." } # many, as LLM streams
          { "type": "done",    "data": {...} }     # once, last
          { "type": "error",   "data": "msg" }     # only on failure
        """
        try:
            context_block, sources, _ = self._retrieve_and_format(query)

            # Send sources up-front so UI can render the panel early
            yield {"type": "sources", "data": sources or []}

            if context_block is None:
                context_block = "(no relevant document snippets retrieved)"

            user_msg = (
                f"CONTEXT:\n{context_block}\n\n"
                f"QUESTION: {query}\n\n"
                f"ANSWER (with [n] citations if drawing on context):"
            )
            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=user_msg),
            ]

            for chunk in self.llm.stream(messages):
                if chunk.content:
                    yield {"type": "token", "data": chunk.content}

            yield {"type": "done", "data": {"finish_reason": "stop"}}

        except Exception as e:
            yield {"type": "error", "data": f"Streaming error: {str(e)}"}


# Singleton: load models once, reuse across all requests
_agent = None
def get_agent() -> RAGAgent:
    global _agent
    if _agent is None:
        _agent = RAGAgent()
    return _agent