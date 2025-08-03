import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";

export default function Navigation({ collapsed, setCollapsed }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const { notes, addNote } = useNotesContext(); // ✅ addNote追加

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
        alert("インポートが完了しました！");
      } catch (err) {
        alert("インポートに失敗しました。形式をご確認ください。");
      }
    };
    reader.readAsText(file);
  };

  return (
    <aside className={`relative h-screen bg-orange-200 border-r shadow-sm text-gray-700 text-sm font-medium transition-all duration-300 ${collapsed ? "w-0 overflow-hidden" : "w-48"
      }`}>

      {!collapsed && (
        <div className="pt-16 px-2 space-y-3">
          <Link to="/" className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/") ? "text-blue-600 font-bold" : ""}`}>
            📁 <span>一覧</span>
          </Link>
          <Link to="/edit/new" className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/edit/new") ? "text-blue-600 font-bold" : ""}`}>
            ✏️ <span>新規作成</span>
          </Link>
          <Link to="/settings" className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/settings") ? "text-blue-600 font-bold" : ""}`}>
            ⚙️ <span>設定(使い方)</span>
          </Link>
          <Link
            to="/tiptap"
            className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/tiptap") ? "text-blue-600 font-bold" : ""
              }`}
          >
            🧪 <span>TipTapテスト</span>
          </Link>

          {/* 📤 JSONエクスポート */}
          <button
            onClick={handleExportAllNotes}
            className="block w-full text-left text-black-600 font-bold hover:text-blue-600"
          >
            📤 エクスポート
          </button>

          {/* 📥 JSONインポート */}
          <label className="block text-red-600 font-bold hover:text-blue-600 cursor-pointer">
            📥 インポート
            <input type="file" accept=".json" onChange={handleImportNotes} className="hidden" />
          </label>
        </div>
      )}
    </aside>
  );
}
