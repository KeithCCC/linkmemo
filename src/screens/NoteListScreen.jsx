import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNotesContext, extractAllTags } from '../context/NotesContext';

export default function NoteListScreen() {
  const { notes } = useNotesContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  if (!notes) {
    return <div className="text-red-500 p-4">ノートが読み込まれていません。</div>;
  }

  // ✅ 全タグ抽出（memo化）
  const allTags = useMemo(() => extractAllTags(notes), [notes]);

  // ✅ 表示対象タグ（検索文字列にマッチ or 選択中タグ）
  const visibleTags = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    if (lower === "") {
      // 入力が空 → 選択中タグだけ表示
      return allTags.filter(tag => selectedTags.includes(tag));
    }
    // 入力あり → 前方一致 or 選択中タグ
    return allTags.filter(tag =>
      tag.toLowerCase().startsWith(lower) || selectedTags.includes(tag)
    );
  }, [searchTerm, allTags, selectedTags]);



  // ✅ タグのON/OFF切り替え
  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // 🔽 並び順（更新日時降順）
  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
    const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
    return dateB.getTime() - dateA.getTime();
  });

  // 🔍 検索 + タグフィルター（AND）
  const lowerTerm = searchTerm.toLowerCase();
  const filteredNotes = sortedNotes.filter((note) => {
    const matchesKeyword =
      note.title.toLowerCase().includes(lowerTerm) ||
      note.content.toLowerCase().includes(lowerTerm) ||
      (Array.isArray(note.tags) && note.tags.some(tag => tag.toLowerCase().includes(lowerTerm)));

    const matchesTags =
      selectedTags.length === 0 ||
      (Array.isArray(note.tags) && selectedTags.every(tag => note.tags.includes(tag)));

    return matchesKeyword && matchesTags;
  });

  return (
    <div className="max-w-3xl mx-auto text-left p-4">
      <h1 className="text-xl font-bold mb-4">ノート一覧 🗂️</h1>

      {/* 🔎 キーワード検索 */}
      {/* 🔎 キーワード検索（×付き） */}
      <div className="relative w-full mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="キーワード検索（タイトル・本文・タグ）"
          className="w-full border border-gray-300 rounded px-3 py-2 pr-10"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            aria-label="検索をクリア"
          >
            ×
          </button>
        )}
      </div>



      {/* 🏷️ タグチップUI（検索連動 + 選択保持） */}
      {visibleTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {visibleTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 text-sm rounded-full border transition ${selectedTags.includes(tag)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* 📄 ノート一覧 */}
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
