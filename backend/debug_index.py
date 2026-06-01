"""Print every chunk in the ChromaDB to see what was actually indexed."""
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
vs = Chroma(persist_directory="chroma_db", embedding_function=embeddings)

raw = vs.get()
docs = raw["documents"]
metas = raw["metadatas"]

print(f"\n{'='*80}")
print(f"Total chunks in index: {len(docs)}")
print(f"{'='*80}\n")

# Group by source
by_source = {}
for text, meta in zip(docs, metas):
    src = meta.get("source", "unknown")
    by_source.setdefault(src, []).append(text)

for src, chunks in sorted(by_source.items()):
    print(f"\n📄 {src}  ({len(chunks)} chunks)")
    for i, chunk in enumerate(chunks, 1):
        preview = chunk[:150].replace("\n", " ")
        print(f"  Chunk {i}: {preview}...")