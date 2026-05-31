/**
 * Main chat container — now with streaming.
 * As tokens stream in, the most-recent assistant message updates live.
 */
import { useState, useRef, useEffect } from "react";
import { chatStream } from "../lib/api";
import MessageList from "./MessageList";

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

    // Push user message + an empty assistant message that we'll fill via streaming
    setMessages((m) => [
      ...m,
      { role: "user", content: query },
      { role: "assistant", content: "", sources: [], streaming: true },
    ]);
    setInput("");
    setStreaming(true);

    // Helper to mutate the LAST message (the streaming assistant one)
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

  function handleClear() {
    if (streaming) return;
    setMessages([]);
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🤖</div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">RAG Agent v3</h1>
            <div className="text-xs text-slate-500">
              Hybrid search · Reranker · Streaming
            </div>
          </div>
        </div>
        <button
          onClick={handleClear}
          disabled={messages.length === 0 || streaming}
          className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Clear chat
        </button>
      </header>

      <div className="flex-1 overflow-hidden max-w-3xl w-full mx-auto flex flex-col">
        <MessageList messages={messages} loading={false} />
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border-t border-slate-200 p-4"
      >
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={streaming}
            autoFocus
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {streaming ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}