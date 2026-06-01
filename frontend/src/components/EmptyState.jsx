/**
 * Welcome state shown when the chat has no messages yet.
 * Big greeting, brand orb, and quick-action chips that submit a query.
 */
const QUICK_CHIPS = [
  { label: "Leave policy", query: "How many days of annual leave do employees get?" },
  { label: "Work from home", query: "Can I work from home and what do I need to set up?" },
  { label: "Reset password", query: "How do I reset my password?" },
  { label: "Warranty info", query: "What's the warranty on the SmartHub X1?" },
  { label: "Report incident", query: "How do I report a security incident?" },
];

export default function EmptyState({ onChipClick }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
      {/* Brand orb */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 blur-2xl opacity-50 rounded-full"></div>
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 flex items-center justify-center shadow-xl shadow-indigo-500/40">
          <span className="text-white text-3xl">✦</span>
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-4xl font-bold text-slate-900 text-center mb-3 tracking-tight">
        Hey! How can I help?
      </h2>
      <p className="text-base text-slate-500 text-center mb-10 max-w-md font-medium">
        Ask anything about your knowledge base — I'll answer with inline citations
        from your documents.
      </p>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
        {QUICK_CHIPS.map((c) => (
          <button
            key={c.label}
            onClick={() => onChipClick(c.query)}
            className="px-4 py-2 rounded-full text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md hover:shadow-indigo-500/10 transition-all"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}