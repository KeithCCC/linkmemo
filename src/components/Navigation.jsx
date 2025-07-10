import React from "react";
import { Link } from "react-router-dom";

export default function Navigation() {
  return (
    <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center border-b">
      {/* Left: Logo */}
      <div className="text-2xl font-bold text-gray-800 tracking-tight">
        <span className="text-blue-600">📝 ASUKA</span>
      </div>

      {/* Right: Menu */}
      <div className="flex space-x-6 text-gray-700 text-sm font-medium">
        <Link to="/" className="hover:text-blue-600 transition-colors">
          一覧
        </Link>
        <Link to="/edit/new" className="hover:text-blue-600 transition-colors">
          ＋新規作成
        </Link>
        <Link to="/settings" className="hover:text-blue-600 transition-colors">
          設定
        </Link>
      </div>
    </nav>
  );
}
