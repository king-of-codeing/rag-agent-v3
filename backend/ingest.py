"""
Ingest documents from docs/ into ChromaDB.
Each chunk stores metadata (source, page, chunk_id) for citation tracking.
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
    docs = load_documents()
    if not docs:
        print("No documents found in docs/. Add files and rerun.")
        return None

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=120,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(docs)

    for i, c in enumerate(chunks):
        c.metadata["chunk_id"] = i

    print(f"Created {len(chunks)} chunks from {len(docs)} pages")

    embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_DIR,
    )
    print(f"Saved index to {CHROMA_DIR}/")
    return vectorstore


if __name__ == "__main__":
    ingest()