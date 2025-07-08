import { useNotesContext } from "../context/NotesContext";
import { Link } from "react-router-dom";

export default function HomeScreen() {
  const { notes = [] } = useNotesContext() ?? {};

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">ノート一覧 🗂️</h1>
      {notes.length === 0 ? (
        <p className="text-gray-500">ノートがまだありません。</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note, index) => (
            <li key={note.id}>
              <Link
                to={`/edit/${note.id}`} // ← 編集画面に変更
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
