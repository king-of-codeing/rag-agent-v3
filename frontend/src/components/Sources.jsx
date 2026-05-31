/**
 * Collapsible source cards shown under each AI message.
 * Each source is a citation chunk from the retrieved documents.
 */
import { useState } from "react";

function SourceCard({ source }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-50 transition"
      >
        <span className="text-sm font-medium text-slate-700">
          <span className="inline-block bg-blue-100 text-blue-700 rounded px-2 py-0.5 mr-2 text-xs font-semibold">
            [{source.id}]
          </span>
          {source.source} · page {source.page}
        </span>
        <span className="text-slate-400 text-sm">
          {open ? "▼" : "▶"}
        </span>
      </button>
      {open && (
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-sm text-slate-600 italic">
          "{source.snippet}"
        </div>
      )}
    </div>
  );
}

export default function Sources({ sources }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
        Sources
      </div>
      <div className="space-y-2">
        {sources.map((s) => (
          <SourceCard key={s.id} source={s} />
        ))}
      </div>
    </div>
  );
}