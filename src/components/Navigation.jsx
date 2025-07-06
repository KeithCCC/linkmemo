import React from 'react'
import { Link } from 'react-router-dom'

export default function Navigation() {
  return (
    <nav className="bg-gray-100 px-4 py-2 flex justify-between items-center border-b">
      <div className="font-bold text-lg text-blue-600">📝 Linkmemo</div>
      <div className="space-x-4 text-sm">
        <Link to="/" className="hover:underline">一覧</Link>
        <Link to="/edit/new" className="hover:underline">＋新規作成</Link>
        <Link to="/settings" className="hover:underline">設定</Link>
      </div>
    </nav>
  )
}
