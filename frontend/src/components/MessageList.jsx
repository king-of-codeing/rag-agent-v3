/**
 * Renders the list of chat messages.
 * User messages on the right (blue), AI messages on the left (white card).
 */
import Sources from "./Sources";

function UserMessage({ content }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3">
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}

function AssistantMessage({ content, sources, error }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        {error ? (
          <div className="text-red-600">
            <strong>Error:</strong> {error}
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap text-slate-800">
              {content}
            </div>
            <Sources sources={sources} />
          </>
        )}
      </div>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export default function MessageList({ messages, loading }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 && !loading && (
        <div className="text-center text-slate-400 mt-20">
          <div className="text-5xl mb-3">📚</div>
          <div className="text-lg">Ask a question about your documents</div>
          <div className="text-sm mt-2">
            Try: "How many days of annual leave do employees get?"
          </div>
        </div>
      )}

      {messages.map((m, i) =>
        m.role === "user" ? (
          <UserMessage key={i} content={m.content} />
        ) : (
          <AssistantMessage
            key={i}
            content={m.content}
            sources={m.sources}
            error={m.error}
          />
        )
      )}

      {loading && <LoadingMessage />}
    </div>
  );
}