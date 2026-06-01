/**
 * Documents library modal — upload, list, and delete indexed documents.
 * Same backend contract as before, polished UI.
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
      setError(`Failed to load documents: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Documents</h2>
              <p className="text-xs text-slate-500 font-medium">
                Uploads reset on server restart (demo)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
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
          className={`m-6 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-indigo-500 bg-indigo-50/50"
              : uploading
              ? "border-violet-300 bg-violet-50/30"
              : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
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
          <div className="flex justify-center mb-3">
            {uploading ? (
              <div className="w-10 h-10 rounded-full border-3 border-violet-200 border-t-violet-600 animate-spin"></div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
                  <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
          <div className="text-base font-bold text-slate-800">
            {uploading ? "Uploading & indexing..." : "Drop files or click to upload"}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            PDF · TXT · MD · max 10 MB each
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div className="mx-6 mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium animate-fade-in">
            {error}
          </div>
        )}

        {/* Docs list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Indexed ({docs.length})
            </div>
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
                  className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2.5 bg-white hover:border-slate-300 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{d.name}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{formatSize(d.size)}</div>
                  </div>
                  <button
                    onClick={() => handleDelete(d.name)}
                    className="ml-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                    aria-label={`Delete ${d.name}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
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