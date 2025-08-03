import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotesContext, extractAllTags } from '../context/NotesContext';

export default function NoteListScreen() {
  const { notes } = useNotesContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [tagStates, setTagStates] = useState({}); // { tag: "include" | "exclude" | "none" }
  const [searchTermBackup, setSearchTermBackup] = useState('');

  // 全タグ抽出
  const allTags = useMemo(() => extractAllTags(notes), [notes]);

  // タグ状態の変化で検索欄をコントロール
  useEffect(() => {
    const entries = Object.entries(tagStates);
    const active = entries.find(([_, state]) => state === "include");
    const excluded = entries.find(([_, state]) => state === "exclude");

    if (active) {
      if (searchTerm !== '') {
        setSearchTermBackup(searchTerm);
        setSearchTerm(''); // ✅ 入力欄を明示的に空にする！
      }
    } else if (excluded) {
      setSearchTerm('');
    } else {
      setSearchTerm(searchTermBackup);
    }
  }, [tagStates]);


  // タグ状態のトグル（none → include → exclude → none）
  const cycleTagState = (tag) => {
    setTagStates((prev) => {
      const current = prev[tag] || "none";
      const next =
        current === "none" ? "include" :
          current === "include" ? "exclude" :
            "none";
      console.log(`Toggling [${tag}] from ${current} to ${next}`);
      return { ...prev, [tag]: next };
    });
  };

  // タグの状態ごとのスタイル
  const getTagClass = (state) => {
    switch (state) {
      case "include": return "bg-blue-600 text-white border-blue-600";
      case "exclude": return "bg-red-500 text-white border-red-500";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  // 表示するタグ一覧（検索語に一致 or 選択中）
  const visibleTags = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return allTags.filter(tag => {
      const state = tagStates[tag] || "none";
      const matchesSearch = lower && tag.toLowerCase().startsWith(lower);
      const isSelected = state !== "none";
      return matchesSearch || isSelected;
    });
  }, [searchTerm, allTags, tagStates]);


  // 更新日時でソート
  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
    const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
    return dateB.getTime() - dateA.getTime();
  });

  const lowerTerm = searchTerm.toLowerCase();
  const includeTags = Object.keys(tagStates).filter(tag => tagStates[tag] === "include");
  const excludeTags = Object.keys(tagStates).filter(tag => tagStates[tag] === "exclude");

  // ノートフィルタリング
  const filteredNotes = sortedNotes.filter((note) => {
    const tags = note.tags || [];

    const matchesKeyword =
      note.title.toLowerCase().includes(lowerTerm) ||
      note.content.toLowerCase().includes(lowerTerm) ||
      tags.some(tag => tag.toLowerCase().includes(lowerTerm));

    const matchesInclude = includeTags.every(tag => tags.includes(tag));
    const hasAnyExclude = excludeTags.some(tag => tags.includes(tag));

    return matchesKeyword && matchesInclude && !hasAnyExclude;
  });

  return (
    <div className="max-w-3xl mx-auto text-left p-4">
      <h1 className="text-xl font-bold mb-4">ノート一覧 🗂️</h1>

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

      {/* 🏷️ タグ三値トグル表示 */}
      {visibleTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {visibleTags.map((tag) => (
            <button
              key={tag}
              onClick={() => cycleTagState(tag)}
              className={`px-3 py-1 text-sm rounded-full border transition ${getTagClass(tagStates[tag] || "none")}`}
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
