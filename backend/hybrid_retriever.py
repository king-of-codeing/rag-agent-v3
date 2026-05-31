"""
Hybrid retriever: combines dense (embedding) and sparse (BM25) search,
fuses results with Reciprocal Rank Fusion (RRF).

Why this is the production-standard:
- Dense alone misses exact terms (codes, names, identifiers).
- Sparse alone misses semantic paraphrases.
- RRF is parameter-light, robust, and beats most learned fusion methods
  in practice (Cormack et al., 2009).
"""
from typing import List
from langchain_core.documents import Document
from rank_bm25 import BM25Okapi


def _tokenize(text: str) -> List[str]:
    """Simple whitespace + lowercase tokenizer. Good enough for BM25."""
    return text.lower().split()


class HybridRetriever:
    def __init__(self, vectorstore, chunks: List[Document], fetch_k: int = 20):
        """
        Args:
            vectorstore: a langchain_chroma.Chroma instance (already loaded)
            chunks: the full list of indexed Document objects (for BM25)
            fetch_k: how many candidates each retriever returns
        """
        self.vectorstore = vectorstore
        self.chunks = chunks
        self.fetch_k = fetch_k

        # Build BM25 index over the chunk texts
        tokenized_corpus = [_tokenize(c.page_content) for c in chunks]
        self.bm25 = BM25Okapi(tokenized_corpus)

    def _dense_search(self, query: str) -> List[Document]:
        """Top-K via embedding similarity (ChromaDB)."""
        retriever = self.vectorstore.as_retriever(search_kwargs={"k": self.fetch_k})
        return retriever.invoke(query)

    def _sparse_search(self, query: str) -> List[Document]:
        """Top-K via BM25 keyword scores."""
        tokens = _tokenize(query)
        scores = self.bm25.get_scores(tokens)
        # Pair each chunk with its BM25 score, sort desc, take top-k
        ranked = sorted(
            zip(self.chunks, scores), key=lambda x: x[1], reverse=True
        )
        return [doc for doc, _score in ranked[: self.fetch_k]]

    def _rrf_fuse(
        self, dense_docs: List[Document], sparse_docs: List[Document], k: int = 60
    ) -> List[Document]:
        """
        Reciprocal Rank Fusion.
        For each doc, sum 1/(k + rank) across both lists.
        Docs that rank high in BOTH come out on top.
        Uses page_content as the dedup key.
        """
        scores = {}
        doc_by_key = {}

        for rank, d in enumerate(dense_docs):
            key = d.page_content
            doc_by_key[key] = d
            scores[key] = scores.get(key, 0) + 1.0 / (k + rank)

        for rank, d in enumerate(sparse_docs):
            key = d.page_content
            doc_by_key[key] = d
            scores[key] = scores.get(key, 0) + 1.0 / (k + rank)

        # Sort by fused score, return Document objects
        ranked_keys = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        return [doc_by_key[k] for k in ranked_keys[: self.fetch_k]]

    def retrieve(self, query: str) -> List[Document]:
        """Run both searches in parallel-ish, fuse, return fused top-K."""
        dense = self._dense_search(query)
        sparse = self._sparse_search(query)
        return self._rrf_fuse(dense, sparse)