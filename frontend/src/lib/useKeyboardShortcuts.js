import { useEffect } from "react";

/**
 * Custom hook for app-wide keyboard shortcuts.
 * Usage:
 *   useKeyboardShortcuts({
 *     onNewChat: () => setMessages([]),
 *     onOpenDocs: () => setDocsOpen(true),
 *     onShowHints: () => setHintsOpen(true),
 *   });
 *
 * Shortcuts: Cmd/Ctrl+J = new chat, Cmd/Ctrl+K = docs, Cmd/Ctrl+/ = hints
 */
export function useKeyboardShortcuts({ onNewChat, onOpenDocs, onShowHints }) {
  useEffect(() => {
    function handler(e) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      // Cmd/Ctrl + J → new chat
      if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        onNewChat?.();
      }

      // Cmd/Ctrl + K → docs library
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenDocs?.();
      }

      // Cmd/Ctrl + / → keyboard hints
      if (e.key === "/") {
        e.preventDefault();
        onShowHints?.();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNewChat, onOpenDocs, onShowHints]);
}