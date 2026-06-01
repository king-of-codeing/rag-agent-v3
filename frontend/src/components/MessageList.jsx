/**
 * Renders the list of chat messages.
 * User on right (blue), AI on left (white card).
 * Assistant messages show a blinking cursor while streaming and content is empty.
 */
import Sources from "./Sources";

function UserMessage({ content }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-base font-medium">
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}

function AssistantMessage({ content, sources, error, streaming }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        {error ? (
          <div className="text-red-600 font-semibold">
            <strong>Error:</strong> {error}
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap text-slate-900 text-base font-medium leading-relaxed">
              {content || (
                <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse rounded-sm" />
              )}
              {streaming && content && (
                <span className="inline-block w-2 h-4 bg-slate-400 ml-1 animate-pulse rounded-sm align-middle" />
              )}
            </div>
            <Sources sources={sources} />
          </>
        )}
      </div>
    </div>
  );
}

export default function MessageList({ messages }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-white">
      {messages.length === 0 && (
        <div className="text-center mt-32">
          <div className="text-6xl mb-6">🤖</div>
          <div className="text-3xl font-bold text-slate-900 mb-2">
            Hey! How can I help you?
          </div>
          <div className="text-base text-slate-500 font-medium">
            Ask anything about your documents
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
            streaming={m.streaming}
          />
        )
      )}
    </div>
  );
}