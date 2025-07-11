// Navigation.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navigation({ collapsed, setCollapsed }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const navWidth = collapsed ? "w-16" : "w-56";
  const labelClass = collapsed ? "hidden" : "inline";

  return (
    <nav className={`fixed left-0 top-0 h-full ${navWidth} bg-white border-r shadow-sm px-4 py-6 flex flex-col text-gray-700 text-sm font-medium transition-all duration-300`}>
      {/* ヘッダーエリア */}
      <div className="flex items-center justify-between mb-8">
        <span className={`text-xl font-bold text-blue-600 ${labelClass}`}>📝 Linkmemo</span>
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-gray-700 text-xs">
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {/* メニューリンク */}
      <Link to="/" className={`mb-4 hover:text-blue-600 ${isActive("/") ? "text-blue-600 font-bold" : ""}`}>
        📁 <span className={labelClass}>一覧</span>
      </Link>
      <Link to="/edit/new" className={`mb-4 hover:text-blue-600 ${isActive("/edit/new") ? "text-blue-600 font-bold" : ""}`}>
        ✏️ <span className={labelClass}>新規作成</span>
      </Link>
      <Link to="/settings" className={`hover:text-blue-600 ${isActive("/settings") ? "text-blue-600 font-bold" : ""}`}>
        ⚙️ <span className={labelClass}>設定</span>
      </Link>
    </nav>
  );
}
