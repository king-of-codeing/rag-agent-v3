/**
 * Main chat container with sidebar layout, empty state, citation-aware
 * messages, docs modal, and keyboard shortcuts.
 */
import { useState, useRef, useEffect } from "react";
import { chatStream } from "../lib/api";
import { useKeyboardShortcuts } from "../lib/useKeyboardShortcuts";
import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import EmptyState from "./EmptyState";
import DocsLibrary from "./DocsLibrary";
import CommandHints from "./CommandHints";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [corpusVersion, setCorpusVersion] = useState(0); // triggers sidebar count refresh
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  function handleNewChat() {
    if (streaming) return;
    setMessages([]);
    setTimeout(() => inputRef.current?.focus(), 10);
  }

  function handleOpenDocs() {
    setDocsOpen(true);
  }

  function handleShowHints() {
    setHintsOpen((open) => !open);
  }

  useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onOpenDocs: handleOpenDocs,
    onShowHints: handleShowHints,
  });

  async function submitQuery(query) {
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
      onSources: (sources) => updateLast((last) => ({ ...last, sources })),
      onToken: (text) =>
        updateLast((last) => ({ ...last, content: last.content + text })),
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

  function handleSubmit(e) {
    e.preventDefault();
    submitQuery(input.trim());
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        onNewChat={handleNewChat}
        onOpenDocs={handleOpenDocs}
        onPromptClick={(q) => submitQuery(q)}
        corpusVersion={corpusVersion}
      />

      {/* Main column */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="text-sm font-bold text-slate-700">
            {messages.length === 0 ? "New conversation" : `Conversation · ${Math.ceil(messages.length / 2)} ${messages.length / 2 === 1 ? "turn" : "turns"}`}
          </div>
          <button
            onClick={handleShowHints}
            className="text-xs text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
            title="Show keyboard shortcuts"
          >
            <kbd className="font-mono">⌘</kbd>
            <kbd className="font-mono">/</kbd>
            <span>shortcuts</span>
          </button>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden flex flex-col max-w-3xl w-full mx-auto">
          {messages.length === 0 ? (
            <EmptyState onChipClick={(q) => submitQuery(q)} />
          ) : (
            <MessageList messages={messages} />
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200 bg-white px-6 py-4"
        >
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                disabled={streaming}
                autoFocus
                className="w-full border border-slate-300 rounded-xl pl-4 pr-12 py-3.5 text-[15px] font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-5 py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/40 transition-all disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {streaming ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Send</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </div>
          <div className="max-w-3xl mx-auto mt-2 text-[11px] text-slate-400 text-center font-medium">
            Responses are grounded in your indexed documents.
            Press <kbd className="px-1 py-0.5 bg-slate-100 rounded font-mono">⌘J</kbd> for new chat.
          </div>
        </form>

        {/* Modals */}
        <DocsLibrary
          open={docsOpen}
          onClose={() => setDocsOpen(false)}
          onCorpusChanged={() => setCorpusVersion((v) => v + 1)}
        />
        <CommandHints open={hintsOpen} onClose={() => setHintsOpen(false)} />
      </main>
    </div>
  );
}