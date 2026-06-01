/**
 * Compact source chips shown under an assistant message.
 * Clicking a chip expands a snippet preview inline.
 */
import { useState } from "react";

function SourceChip({ source, expanded, onToggle }) {
  return (
    <div className="inline-block">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
          expanded
            ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
        }`}
      >
        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-[10px] font-bold">
          {source.id}
        </span>
        <span className="font-medium truncate max-w-[180px]">{source.source}</span>
        <span className="text-slate-400 text-[10px]">p.{source.page}</span>
      </button>
    </div>
  );
}

export default function Sources({ sources }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!sources || sources.length === 0) return null;

  const expanded = sources.find((s) => s.id === expandedId);

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
        Sources
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <SourceChip
            key={s.id}
            source={s}
            expanded={expandedId === s.id}
            onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
          />
        ))}
      </div>

      {/* Expanded snippet preview */}
      {expanded && (
        <div className="mt-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 animate-fade-in">
          <div className="flex items-start gap-2 text-xs">
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-bold">
              {expanded.id}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-slate-700 font-semibold mb-1">
                {expanded.source} · page {expanded.page}
              </div>
              <div className="text-slate-600 italic leading-relaxed">
                "{expanded.snippet}"
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}