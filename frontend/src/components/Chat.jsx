/**
 * Main chat container — with streaming, white background, bold text,
 * and a "New chat" icon button instead of a text button.
 */
import { useState, useRef, useEffect } from "react";
import { chatStream } from "../lib/api";
import MessageList from "./MessageList";

// Inline SVG icon for "new chat" (pencil-on-square style)
function NewChatIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      {/* Page outline */}
      <path d="M4 4h9" />
      <path d="M4 4v16h16v-9" />
      {/* Pencil */}
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L13 14l-4 1 1-4 8.5-8.5z" />
    </svg>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function handleSubmit(e) {
    e.preventDefault();
    const query = input.trim();
    if (!query || streaming) return;

    setMessages((m) => [
      ...m,
      { role: "user", content: query },
      { role: "assistant", content: "", sources: [], streaming: true },
    ]);
    setInput("");
    setStreaming(true);

    const updateLast = (mutator) => {
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = mutator(last);
        return copy;
      });
    };

    await chatStream(query, {
      onSources: (sources) => {
        updateLast((last) => ({ ...last, sources }));
      },
      onToken: (text) => {
        updateLast((last) => ({ ...last, content: last.content + text }));
      },
      onDone: () => {
        updateLast((last) => ({ ...last, streaming: false }));
        setStreaming(false);
      },
      onError: (message) => {
        updateLast((last) => ({
          ...last,
          content: "",
          error: message,
          streaming: false,
        }));
        setStreaming(false);
      },
    });
  }

  function handleNewChat() {
    if (streaming) return;
    setMessages([]);
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🤖</div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">RAG Agent v3</h1>
            <div className="text-xs text-slate-500 font-medium">
              Hybrid search · Reranker · Streaming
            </div>
          </div>
        </div>
        <button
          onClick={handleNewChat}
          disabled={messages.length === 0 || streaming}
          title="New chat"
          aria-label="New chat"
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <NewChatIcon />
        </button>
      </header>

      {/* Message area */}
      <div className="flex-1 overflow-hidden max-w-3xl w-full mx-auto flex flex-col bg-white">
        <MessageList messages={messages} loading={false} />
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border-t border-slate-200 p-4"
      >
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            disabled={streaming}
            autoFocus
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-base font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {streaming ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}