import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navigation({ collapsed, setCollapsed }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="relative h-screen bg-white border-r shadow-sm text-gray-700 text-sm font-medium">
      {/* Collapse中でも表示されるハンバーガー */}
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="bg-white border rounded p-2 text-lg text-gray-600 shadow hover:text-black"
          aria-label="メニューを開く"
        >
          ☰
        </button>
      </div>

      {/* メニュー本体（Collapse時は非表示） */}
      {!collapsed && (
        <div className="pt-16 px-2 space-y-2">
          {/* ヘッダー */}
          <div className="text-xl font-bold text-blue-600 pl-2">📝 ASUKA2</div>

          {/* メニューリンク */}
          <Link
            to="/"
            className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/") ? "text-blue-600 font-bold" : ""
              }`}
          >
            📁 <span>一覧</span>
          </Link>
          <Link
            to="/edit/new"
            className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/edit/new") ? "text-blue-600 font-bold" : ""
              }`}
          >
            ✏️ <span>新規作成</span>
          </Link>
          <Link
            to="/settings"
            className={`flex items-center gap-2 hover:text-blue-600 ${isActive("/settings") ? "text-blue-600 font-bold" : ""
              }`}
          >
            ⚙️ <span>設定</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
