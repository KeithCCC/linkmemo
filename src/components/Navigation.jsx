import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";
import { getRecentNotes, RECENT_NOTES_EVENT } from "../recentNotes";
import { useAuthContext } from "../context/AuthContext";

export default function Navigation({ collapsed, setCollapsed, user: userProp, onLogin, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;

  const { notes, addNote } = useNotesContext();
  const { user: ctxUser } = useAuthContext() || {};
  const user = userProp || ctxUser;

  const [recent, setRecent] = useState([]);
  const [showSecondary, setShowSecondary] = useState(false);

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
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedNotes = JSON.parse(event.target.result);
        importedNotes.forEach((note) => {
          if (note.title && note.content) addNote(note);
        });
        alert("インポートが完了しました。");
      } catch {
        alert("インポートに失敗しました。JSON形式を確認してください。");
      }
    };
    reader.readAsText(file);
  };

  const jumpToSearch = () => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("asuka-list-focus-search"));
      }, 120);
      return;
    }
    window.dispatchEvent(new CustomEvent("asuka-list-focus-search"));
  };

  const triggerSaveText = () => {
    if (location.pathname.startsWith("/edit/")) {
      window.dispatchEvent(new CustomEvent("asuka-export-text"));
    }
  };

  const navLinkClass = (active) =>
    `flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${
      active
        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
        : "hover:bg-gray-100 dark:hover:bg-gray-600"
    }`;

  return (
    <aside
      className={`relative min-h-screen bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-500 shadow-sm text-gray-700 dark:text-gray-100 text-sm font-medium transition-all duration-300 flex flex-col ${collapsed ? "w-0 overflow-hidden" : "w-64"}`}
    >
      {!collapsed && (
        <>
          <div className="pt-4 px-3 space-y-1 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wide text-gray-500">Workspace</div>
              <button
                onClick={() => setCollapsed(true)}
                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                title="サイドバーを閉じる"
              >
                閉じる
              </button>
            </div>

            <div className="flex items-center justify-between rounded bg-white/80 dark:bg-gray-800 px-3 py-2 text-xs mb-3">
              {user ? (
                <>
                  <span className="truncate max-w-[8rem]" title={user.displayName || user.email}>
                    [{user.displayName || user.email || "User"}]
                  </span>
                  <button
                    onClick={onLogout}
                    className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <button
                  onClick={onLogin}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 w-full text-center transition-colors"
                >
                  ログイン
                </button>
              )}
            </div>

            <nav className="space-y-0.5">
              <Link to="/" className={navLinkClass(isActive("/"))}>
                <span className="text-base">📁</span>
                <span>一覧</span>
              </Link>

              <Link to="/edit/new" className={navLinkClass(isActive("/edit/new"))}>
                <span className="text-base">✏️</span>
                <span>新規作成</span>
              </Link>

              <Link to="/settings" className={navLinkClass(isActive("/settings"))}>
                <span className="text-base">⚙️</span>
                <span>使い方</span>
              </Link>
            </nav>

            <section className="mt-3 rounded border border-gray-200 dark:border-gray-500 bg-white/60 dark:bg-gray-800/50 p-2">
              <div className="text-xs text-gray-500 dark:text-gray-300 mb-2">クイック操作</div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => navigate("/edit/new")}
                  className="text-left px-2 py-1.5 rounded text-xs app-chip app-panel-hover"
                >
                  新規ノート
                </button>
                <button
                  onClick={jumpToSearch}
                  className="text-left px-2 py-1.5 rounded text-xs app-chip app-panel-hover"
                >
                  一覧検索へ
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("asuka-list-cycle-view"))}
                  className="text-left px-2 py-1.5 rounded text-xs app-chip app-panel-hover"
                >
                  表示切替
                </button>
              </div>
            </section>

            <div className="pt-2">
              <button
                onClick={() => setShowSecondary((v) => !v)}
                className="flex items-center justify-between w-full px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <span className="uppercase tracking-wide font-semibold">詳細機能</span>
                <span className={`transition-transform duration-200 ${showSecondary ? "rotate-90" : ""}`}>›</span>
              </button>

              {showSecondary && (
                <nav className="space-y-0.5 mt-1">
                  <Link to="/tiptap" className={navLinkClass(isActive("/tiptap")) + " text-xs"}>
                    <span className="text-sm">🧪</span>
                    <span>TipTap エディタ</span>
                  </Link>

                  <button
                    onClick={triggerSaveText}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs w-full text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span className="text-sm">💾</span>
                    <span>テキスト保存</span>
                  </button>

                  <button
                    onClick={handleExportAllNotes}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs w-full text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span className="text-sm">📤</span>
                    <span>エクスポート</span>
                  </button>

                  <label className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <span className="text-sm">📥</span>
                    <span>インポート</span>
                    <input type="file" accept=".json" onChange={handleImportNotes} className="hidden" />
                  </label>

                  <Link to="/extension" className={navLinkClass(isActive("/extension")) + " text-xs"}>
                    <span className="text-sm">🔌</span>
                    <span>拡張機能</span>
                  </Link>
                </nav>
              )}
            </div>
          </div>

          <div className="flex-1 mt-3 border-t border-gray-200 dark:border-gray-500 px-3 pt-2 pb-3 overflow-y-auto">
            <div className="text-xs text-gray-500 dark:text-gray-300 mb-2">最近開いたノート</div>
            {recent.length === 0 ? (
              <div className="text-xs app-muted-text">最近開いたノートはありません。</div>
            ) : (
              <div className="space-y-1">
                {recent.slice(0, 10).map((note) => (
                  <Link
                    key={note.id}
                    to={`/edit/${note.id}`}
                    className="block px-2 py-1.5 rounded text-xs text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600 truncate"
                    title={note.title}
                  >
                    {note.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
