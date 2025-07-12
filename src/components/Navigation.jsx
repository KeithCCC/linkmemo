// Navigation.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navigation({ collapsed, setCollapsed }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const labelClass = collapsed ? "hidden sm:inline" : "inline";

  return (
    <nav
      className={`
        fixed top-0 left-0 h-full z-40 bg-white border-r shadow-sm px-4 py-6
        text-gray-700 text-sm font-medium transition-transform duration-300
        ${collapsed ? "-translate-x-full" : "translate-x-0"}
        sm:translate-x-0 sm:static sm:w-56 w-64
      `}
    >
      {/* モバイル用クローズボタン */}
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <span className={`text-xl font-bold text-blue-600 ${labelClass}`}>
          📝 ASUKA
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-400 hover:text-gray-700 text-xs sm:hidden"
        >
          ✕
        </button>
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
  );
}
