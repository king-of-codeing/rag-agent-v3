/**
 * Keyboard shortcut hints modal. Toggled via Cmd/Ctrl + /.
 */
const SHORTCUTS = [
  { keys: ["⌘", "J"], label: "New chat" },
  { keys: ["⌘", "K"], label: "Open documents" },
  { keys: ["⌘", "/"], label: "Show / hide this panel" },
  { keys: ["Enter"], label: "Send message" },
  { keys: ["Esc"], label: "Close modals" },
];

function Key({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 font-mono shadow-sm">
      {children}
    </kbd>
  );
}

export default function CommandHints({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Keyboard shortcuts</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Move faster around the app</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50"
            >
              <span className="text-sm text-slate-700 font-medium">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <Key key={i}>{k}</Key>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}