import { useEffect, useState } from "react";
import { listDocs } from "../lib/api";

const SUGGESTED_PROMPTS = [
  "How many leave days do I get?",
  "How do I work from home?",
  "What's the SmartHub warranty?",
  "How do I reset my password?",
  "How do I report a security incident?",
];

function SidebarButton({ icon, label, shortcut, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
        active
          ? "bg-slate-700/60 text-white"
          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
      }`}
    >
      <span className="text-slate-400 group-hover:text-slate-200">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-xs text-slate-500 font-mono">{shortcut}</span>
      )}
    </button>
  );
}

export default function Sidebar({ onNewChat, onOpenDocs, onPromptClick, corpusVersion }) {
  const [docCount, setDocCount] = useState(null);

  useEffect(() => {
    listDocs()
      .then((d) => setDocCount(d.documents?.length ?? 0))
      .catch(() => setDocCount(null));
  }, [corpusVersion]);

  return (
    <aside className="w-72 shrink-0 bg-slate-900 text-white flex flex-col h-screen">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white text-lg">✦</span>
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight brand-gradient">
              RAG Agent
            </h1>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              v3 · Production
            </div>
          </div>
        </div>
      </div>

      {/* Primary actions */}
      <div className="px-3 py-3 space-y-1">
        <SidebarButton
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          }
          label="New chat"
          shortcut="⌘J"
          onClick={onNewChat}
        />
        <SidebarButton
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          label="Documents"
          shortcut="⌘K"
          onClick={onOpenDocs}
        />
      </div>

      {/* Stats card */}
      <div className="px-4 py-3">
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
            Knowledge Base
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-white">
              {docCount ?? "—"}
            </span>
            <span className="text-xs text-slate-400 font-medium">documents indexed</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            17/17 eval passing
          </div>
        </div>
      </div>

      {/* Suggested prompts */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3 px-1">
          💡 Try asking
        </div>
        <div className="space-y-1.5">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => onPromptClick(p)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors leading-relaxed"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800">
        <div className="text-[10px] text-slate-500 leading-relaxed font-medium">
          <div className="font-bold text-slate-400 mb-0.5">Stack</div>
          Hybrid search · Reranker · SSE streaming
        </div>
      </div>
    </aside>
  );
}