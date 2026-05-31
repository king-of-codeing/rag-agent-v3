"""
RAG agent: retrieves chunks, passes them to Groq with citation-aware prompt,
returns both the answer text and the list of source chunks used.
"""
import os
from typing import List, Tuple, Dict
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()

CHROMA_DIR = "chroma_db"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
GROQ_MODEL = "llama-3.1-8b-instant"
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
        self.embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
        self.vectorstore = Chroma(
            persist_directory=CHROMA_DIR,
            embedding_function=self.embeddings,
        )
        self.retriever = self.vectorstore.as_retriever(search_kwargs={"k": TOP_K})
        self.llm = ChatGroq(
            model=GROQ_MODEL,
            temperature=0.2,
            api_key=os.getenv("GROQ_API_KEY"),
        )

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
        docs = self.retriever.invoke(query)
        if not docs:
            return {
                "answer": "I don't have enough information in the provided documents to answer that.",
                "sources": [],
            }

        context_block, sources = self._format_context(docs)
        user_msg = f"CONTEXT:\n{context_block}\n\nQUESTION: {query}\n\nANSWER (with [n] citations):"

        response = self.llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_msg),
        ])
        return {"answer": response.content, "sources": sources}


# Singleton: avoid reloading the model on every API request
_agent = None
def get_agent() -> RAGAgent:
    global _agent
    if _agent is None:
        _agent = RAGAgent()
    return _agent