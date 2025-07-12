import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navigation({ collapsed, setCollapsed }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const labelClass = collapsed ? "hidden sm:inline" : "inline";

  return (
    <>
     {collapsed && (
      <div className="absolute top-4 left-4 sm:left-2 z-50">
        <button
          onClick={() => setCollapsed(false)}
          className="bg-white border rounded px-2 py-1 text-xs text-gray-600 shadow hover:text-black"
        >
          ☰ メニュー
        </button>
      </div>
    )}

    <nav
      className={`
        h-screen bg-white border-r shadow-sm px-4 py-6
        text-gray-700 text-sm font-medium transition-all duration-300
        ${collapsed ? "hidden sm:block w-20" : "w-64"}
      `}
    >
      {/* モバイル用クローズボタン（非表示） */}
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <span className={`text-xl font-bold text-blue-600 ${labelClass}`}>
          📝 ASUKA
        </span>
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
        className={`mb-4 block hover:text-blue-600 ${
          isActive("/") ? "text-blue-600 font-bold" : ""
        }`}
      >
        📁 <span className={labelClass}>一覧</span>
      </Link>
      <Link
        to="/edit/new"
        className={`mb-4 block hover:text-blue-600 ${
          isActive("/edit/new") ? "text-blue-600 font-bold" : ""
        }`}
      >
        ✏️ <span className={labelClass}>新規作成</span>
      </Link>
      <Link
        to="/settings"
        className={`block hover:text-blue-600 ${
          isActive("/settings") ? "text-blue-600 font-bold" : ""
        }`}
      >
        ⚙️ <span className={labelClass}>設定</span>
      </Link>
    </nav>
  </>
  );
}
