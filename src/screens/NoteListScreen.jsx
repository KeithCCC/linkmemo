import React from 'react'
import { Link } from 'react-router-dom'

const dummyNotes = [
  { id: 1, title: '会議メモ', updatedAt: '2025-07-05', tags: ['会議'] },
  { id: 2, title: '設計案の草稿', updatedAt: '2025-07-04', tags: ['設計', '重要'] },
  { id: 3, title: '思いつきメモ', updatedAt: '2025-07-03', tags: [] },
]

export default function NoteListScreen() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">ノート一覧</h1>
      <ul className="space-y-2">
        {dummyNotes.map((note) => (
          <li key={note.id} className="p-3 border rounded hover:bg-gray-50">
            <div className="font-semibold">
              <Link className="text-blue-600" to={`/note/${note.id}`}>{note.title}</Link>
            </div>
            <div className="text-sm text-gray-500">更新日: {note.updatedAt}</div>
            {note.tags.length > 0 && (
              <div className="mt-1 space-x-1">
                {note.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-200 px-2 py-1 rounded">#{tag}</span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link to="/settings" className="underline text-sm">設定へ</Link>
      </div>
    </div>
  )
}
