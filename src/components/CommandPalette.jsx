import React, { useEffect, useMemo, useState } from "react";

export default function CommandPalette({ open, onClose, actions }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const filteredActions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter((action) =>
      `${action.label} ${action.keywords || ""}`.toLowerCase().includes(needle)
    );
  }, [actions, query]);

  useEffect(() => {
    if (activeIndex > filteredActions.length - 1) {
      setActiveIndex(0);
    }
  }, [filteredActions.length, activeIndex]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          filteredActions.length === 0 ? 0 : (prev + 1) % filteredActions.length
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          filteredActions.length === 0
            ? 0
            : (prev - 1 + filteredActions.length) % filteredActions.length
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const active = filteredActions[activeIndex];
        if (!active) return;
        active.onSelect();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filteredActions, activeIndex, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-xl rounded-xl border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 shadow-xl">
        <div className="p-3 border-b border-gray-200 dark:border-gray-500">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="コマンド検索..."
            className="w-full rounded-md border border-gray-300 dark:border-gray-500 px-3 py-2 bg-white dark:bg-gray-700"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">一致するコマンドはありません。</div>
          ) : (
            filteredActions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => {
                  action.onSelect();
                  onClose();
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  index === activeIndex
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <div className="font-medium">{action.label}</div>
                {action.hint && (
                  <div
                    className={`text-xs ${
                      index === activeIndex ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {action.hint}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
