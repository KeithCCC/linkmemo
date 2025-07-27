import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotesContext } from '../context/NotesContext';

export default function NoteListScreen() {
  const { notes } = useNotesContext();
  const [searchTerm, setSearchTerm] = useState('');

  if (!notes) {
    return <div className="text-red-500 p-4">ノートが読み込まれていません。</div>;
  }

  // Firestore Timestamp か文字列かに応じて Date オブジェクトに変換し、更新日時で降順ソート
  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
    const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
    return dateB.getTime() - dateA.getTime();
  });

  // 検索フィルター
  const lowerTerm = searchTerm.toLowerCase();
  const filteredNotes = sortedNotes.filter((note) => {
    return (
      note.title.toLowerCase().includes(lowerTerm) ||
      note.content.toLowerCase().includes(lowerTerm) ||
      (Array.isArray(note.tags) && note.tags.some(tag => tag.toLowerCase().includes(lowerTerm)))
    );
  });

  return (
    <div className="max-w-3xl mx-auto text-left p-4">
      <h1 className="text-xl font-bold mb-4">ノート一覧 🗂️</h1>

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="キーワード検索（タイトル・本文・タグ）"
        className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
      />

      {filteredNotes.length === 0 ? (
        <p className="text-gray-500 italic">検索結果が見つかりませんでした…</p>
      ) : (
        <ul className="space-y-2">
          {filteredNotes.map((note) => (
            <li key={note.id} className="p-3 border rounded hover:bg-gray-50">
              <div className="font-semibold">
                <Link className="text-blue-600" to={`/edit/${note.id}`}>{note.title}</Link>
              </div>
              <div className="text-sm text-gray-500">
                更新日: {(note.updatedAt?.toDate ? note.updatedAt.toDate() : new Date(note.updatedAt)).toLocaleString()}
              </div>
              {Array.isArray(note.tags) && note.tags.length > 0 && (
                <div className="mt-1 space-x-1">
                  {note.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-200 px-2 py-1 rounded">#{tag}</span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Link to="/settings" className="underline text-sm">設定へ</Link>
      </div>
    </div>
  );
}
// 元の実装から更新日時ソートを追加し、検索フィルタ後に表示順を制御しています。fileciteturn1file0
