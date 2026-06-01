/**
 * Modal showing all uploaded documents and an upload area.
 * Opens when the docs button in the header is clicked.
 */
import { useState, useEffect, useRef } from "react";
import { listDocs, uploadDoc, deleteDoc } from "../lib/api";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocsLibrary({ open, onClose, onCorpusChanged }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await listDocs();
      setDocs(data.documents || []);
    } catch (e) {
      setError(`Failed to load docs: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");

    for (const file of files) {
      try {
        await uploadDoc(file);
      } catch (e) {
        setError(`Failed to upload ${file.name}: ${e.message}`);
        break;
      }
    }
    setUploading(false);
    await refresh();
    onCorpusChanged?.();
  }

  async function handleDelete(name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await deleteDoc(name);
      await refresh();
      onCorpusChanged?.();
    } catch (e) {
      setError(`Failed to delete: ${e.message}`);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">📚 Documents</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Demo: uploads reset on Space restart
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Upload area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`m-6 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            dragOver
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.markdown"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="text-3xl mb-2">📤</div>
          <div className="text-base font-semibold text-slate-700">
            {uploading ? "Uploading & indexing..." : "Drop files here or click to browse"}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            PDF, TXT, MD · max 10 MB
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div className="mx-6 mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Docs list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
            Indexed Documents ({docs.length})
          </div>
          {loading && !docs.length ? (
            <div className="text-sm text-slate-500 font-medium">Loading...</div>
          ) : docs.length === 0 ? (
            <div className="text-sm text-slate-500 font-medium">
              No documents yet. Upload one to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 bg-white"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">📄</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {d.name}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {formatSize(d.size)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(d.name)}
                    className="ml-2 text-slate-400 hover:text-red-600 text-lg transition"
                    title="Delete"
                    aria-label={`Delete ${d.name}`}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}