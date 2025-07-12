import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navigation({ collapsed, setCollapsed }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* 畳まれているときに表示される「☰」ボタン */}
      {collapsed && (
        <div className="absolute top-4 left-4 sm:left-2 z-50">
          <button
            onClick={() => setCollapsed(false)}
            className="bg-white border rounded p-2 text-lg text-gray-600 shadow hover:text-black"
            aria-label="メニューを開く"
          >
            ☰
          </button>
        </div>
      )}

      <nav
        className={`
          h-screen bg-white border-r shadow-sm px-2 py-6 overflow-hidden
          text-gray-700 text-sm font-medium transition-all duration-300
          ${collapsed ? "hidden sm:block w-14" : "w-64"}
        `}
      >
        {/* ヘッダー */}
        <div className={`flex items-center justify-between mb-6 sm:mb-8`}>
          {!collapsed && (
            <span className="text-xl font-bold text-blue-600 pl-2">
              📝 ASUKA
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-gray-700 text-xs hidden sm:block"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {/* メニューリンク */}
        <Link
          to="/"
          className={`mb-2 flex items-center ${
            collapsed ? "justify-center" : "gap-2 pl-2"
          } hover:text-blue-600 ${
            isActive("/") ? "text-blue-600 font-bold" : ""
          }`}
        >
          📁 {!collapsed && <span>一覧</span>}
        </Link>
        <Link
          to="/edit/new"
          className={`mb-2 flex items-center ${
            collapsed ? "justify-center" : "gap-2 pl-2"
          } hover:text-blue-600 ${
            isActive("/edit/new") ? "text-blue-600 font-bold" : ""
          }`}
        >
          ✏️ {!collapsed && <span>新規作成</span>}
        </Link>
        <Link
          to="/settings"
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-2 pl-2"
          } hover:text-blue-600 ${
            isActive("/settings") ? "text-blue-600 font-bold" : ""
          }`}
        >
          ⚙️ {!collapsed && <span>設定</span>}
        </Link>
      </nav>
    </>
  );
}
