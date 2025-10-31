import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";
import { getRecentNotes, RECENT_NOTES_EVENT } from "../recentNotes";

export default function Navigation({ collapsed, setCollapsed }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const { notes, addNote } = useNotesContext();

  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const refresh = () => setRecent(getRecentNotes());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(RECENT_NOTES_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(RECENT_NOTES_EVENT, refresh);
    };
  }, []);

  const handleExportAllNotes = () => {
    const json = JSON.stringify(notes, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "asuka-notes.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportNotes = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedNotes = JSON.parse(event.target.result);
        importedNotes.forEach((note) => {
          if (note.title && note.content) {
            addNote(note);
          }
        });
        alert("インポートが完了しました");
      } catch (err) {
        alert("インポートに失敗しました。形式をご確認ください");
      }
    };
    reader.readAsText(file);
  };

  return (
    <aside
      className={`relative min-h-screen bg-orange-200 border-r shadow-sm text-gray-700 text-sm font-medium transition-all duration-300 ${collapsed ? "w-0 overflow-hidden" : "w-48"}`}
    >
      {!collapsed && (
        <div className="pt-16 px-2 space-y-3">
          <Link
            to="/"
            className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/") ? "text-blue-600 font-bold" : ""}`}
          >
            📁 <span>一覧</span>
          </Link>
          <Link
            to="/edit/new"
            className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/edit/new") ? "text-blue-600 font-bold" : ""}`}
          >
            ✏️ <span>新規作成</span>
          </Link>
          <Link
            to="/settings"
            className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/settings") ? "text-blue-600 font-bold" : ""}`}
          >
            ⚙️ <span>設定(使い方)</span>
          </Link>
          <Link
            to="/tiptap"
            className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/tiptap") ? "text-blue-600 font-bold" : ""}`}
          >
            🧪 <span>TipTapテスト</span>
          </Link>

          {/* JSON エクスポート */}
          <button
            onClick={handleExportAllNotes}
            className="block w-full text-left text-black-600 font-bold hover:text-blue-600"
          >
            📤 エクスポート
          </button>

          {/* JSON インポート */}
          <label className="block text-red-600 font-bold hover:text-blue-600 cursor-pointer">
            📥 インポート
            <input type="file" accept=".json" onChange={handleImportNotes} className="hidden" />
          </label>

          <Link
            to="/extension"
            className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/extension") ? "text-blue-600 font-bold" : ""}`}
          >
            🧩 <span>拡張機能</span>
          </Link>

          {/* separator */}
          <div className="my-3 border-t border-orange-300" />

          {/* 最近のノート */}
          {recent.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide opacity-70">最近のノート</div>
              {recent.map((n) => (
                <Link
                  key={n.id}
                  to={`/edit/${n.id}`}
                  className={`block truncate hover:text-blue-700 ${isActive(`/edit/${n.id}`) ? "text-blue-700 font-bold" : ""}`}
                  title={n.title}
                >
                  • {n.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
