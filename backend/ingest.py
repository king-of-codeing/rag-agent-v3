"""
Ingest documents from docs/ into ChromaDB.

Clears the existing Chroma collection through its API (instead of deleting
the folder) so this works safely even on Windows when the agent already has
the database open.
"""
from pathlib import Path
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

DOCS_DIR = Path("docs")
CHROMA_DIR = "chroma_db"
EMBED_MODEL = "BAAI/bge-small-en-v1.5"


def load_documents():
    documents = []
    for filepath in DOCS_DIR.glob("*"):
        if filepath.is_dir():
            continue
        suffix = filepath.suffix.lower()
        try:
            if suffix == ".pdf":
                loader = PyPDFLoader(str(filepath))
            elif suffix == ".txt":
                loader = TextLoader(str(filepath), encoding="utf-8")
            elif suffix in (".md", ".markdown"):
                loader = UnstructuredMarkdownLoader(str(filepath))
            else:
                print(f"Skipping unsupported file: {filepath.name}")
                continue

            docs = loader.load()
            for d in docs:
                d.metadata["source"] = filepath.name
                d.metadata.setdefault("page", 1)
            documents.extend(docs)
            print(f"Loaded {filepath.name} ({len(docs)} page(s))")
        except Exception as e:
            print(f"Failed to load {filepath.name}: {e}")
    return documents


def ingest():
    print("Starting ingestion...")

    embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)

    # Open (or create) the existing persistent collection
    vectorstore = Chroma(
        persist_directory=CHROMA_DIR,
        embedding_function=embeddings,
    )

    # Clear existing chunks via the API (no file locks)
    try:
        existing = vectorstore.get()
        ids = existing.get("ids", []) or []
        if ids:
            print(f"Clearing {len(ids)} existing chunks from collection...")
            vectorstore.delete(ids=ids)
    except Exception as e:
        print(f"Warning: could not clear existing chunks: {e}")

    # Load fresh docs
    docs = load_documents()
    if not docs:
        print("No documents found in docs/. Index is now empty.")
        return vectorstore

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=120,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(docs)

    for i, c in enumerate(chunks):
        c.metadata["chunk_id"] = i

    print(f"Created {len(chunks)} chunks from {len(docs)} pages")

    # Add new chunks to the (now empty) persistent collection
    vectorstore.add_documents(chunks)
    print(f"Saved index to {CHROMA_DIR}/")
    return vectorstore


if __name__ == "__main__":
    ingest()