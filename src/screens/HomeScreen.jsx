import { useNotesContext } from "../context/NotesContext";
import { Link } from "react-router-dom";

export default function HomeScreen() {
  const {
    searchText,
    setSearchText,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
      getSortedNotes,
  } = useNotesContext();

  const notes = getSortedNotes();

  return (
    <div className="p-4 py-1">
      <h1 className="text-xl font-bold mb-2">ノート一覧 🗂️</h1>

      {/* 🔍 検索バー */}
      <input
        type="text"
        placeholder="キーワードで検索（タイトル・本文）"
        className="w-full px-4 py-2 border rounded mb-4"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      {/* 📅 並び替えコントロール */}
      <div className="flex gap-4 items-center mb-4">
        <select
          className="border px-2 py-1 rounded"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="createdAt">作成日</option>
          <option value="updatedAt">更新日</option>
        </select>

        <button
          onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          {sortOrder === "asc" ? "昇順 ↑" : "降順 ↓"}
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-gray-500">該当するノートが見つかりません。</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note, index) => (
            <li key={note.id}>
              <Link
                to={`/edit/${note.id}`}
                className="text-blue-600 underline hover:text-blue-800"
              >
                {index + 1}. {note.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
