// HomeScreen.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNotes } from "../supabaseNotesService";

export default function HomeScreen({ user }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotes = async () => {
      if (!user?.uid) return;

      try {
        const fetchedNotes = await getNotes(user.uid);
        setNotes(fetchedNotes);
      } catch (e) {
        console.error("ノートの取得に失敗しました", e);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [user]);

  return (
    <div className="p-2 py-1">
      <h1 className="text-xl font-bold mb-2">ノート一覧 🗂️</h1>

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : notes.length === 0 ? (
        <p className="text-gray-500">ノートが見つかりませんでした。</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note, index) => (
            <li key={note.id}>
              <Link
                to={`/edit/${note.id}`}
                className="text-blue-600 underline hover:text-blue-800"
              >
                {index + 1}. {note.title || "無題"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
