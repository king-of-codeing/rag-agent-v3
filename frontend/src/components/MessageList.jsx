/**
 * Renders the list of chat messages with smooth fade-in animations and
 * citation-aware text rendering (turns [1], [2] into colored badges).
 */
import Sources from "./Sources";

/**
 * Parse content like "Annual leave is 24 days [1] and can carry over [1][3]"
 * into spans + citation badges.
 */
function renderWithCitations(content, sources) {
  if (!content) return null;
  const parts = content.split(/(\[\d+\](?:\[\d+\])*)/g);
  return parts.map((part, idx) => {
    const matches = part.match(/\[(\d+)\]/g);
    if (!matches) {
      return <span key={idx}>{part}</span>;
    }
    return matches.map((m, j) => {
      const id = parseInt(m.slice(1, -1), 10);
      const exists = sources?.some((s) => s.id === id);
      return (
        <span
          key={`${idx}-${j}`}
          className={`citation-badge ${exists ? "" : "opacity-40"}`}
          title={exists ? `Source ${id}` : "Unknown source"}
        >
          {id}
        </span>
      );
    });
  });
}

function UserMessage({ content }) {
  return (
    <div className="flex justify-end animate-fade-in-up">
      <div className="max-w-[80%] bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-md shadow-indigo-500/20">
        <div className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ content, sources, error, streaming }) {
  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="max-w-[85%]">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl rounded-bl-md px-4 py-3 text-red-700">
            <div className="text-xs font-bold mb-1 uppercase tracking-wider">Error</div>
            <div className="text-sm font-medium">{error}</div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
            <div className="text-[15px] text-slate-900 leading-relaxed">
              {content ? (
                <>
                  {renderWithCitations(content, sources)}
                  {streaming && (
                    <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse rounded-sm align-middle" />
                  )}
                </>
              ) : (
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
            </div>
            <Sources sources={sources} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessageList({ messages }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
      {messages.map((m, i) =>
        m.role === "user" ? (
          <UserMessage key={i} content={m.content} />
        ) : (
          <AssistantMessage
            key={i}
            content={m.content}
            sources={m.sources}
            error={m.error}
            streaming={m.streaming}
          />
        )
      )}
    </div>
  );
}