// src/screens/NoteDetailScreen.jsx
import { useParams, Link } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";

export default function NoteDetailScreen() {
  const { id } = useParams();
  const { getNoteById, notes } = useNotesContext();
  const note = getNoteById(id);

  if (!note) {
    return <h2 className="p-4 text-red-500">ノートが見つかりませんでした（ID: {id}）</h2>;
  }

  // 🔹 [[リンク]] → <Link> に変換
  const parseLinks = (text) => {
    const parts = text.split(/\[\[|\]\]/);
    return parts.map((part, i) => {
      if (i % 2 === 0) return <span key={i}>{part}</span>;

      // リンク先ノートを探す（タイトル一致）
      const target = notes.find(n => n.title === part);
      return target ? (
        <Link key={i} to={`/note/${target.id}`} className="text-blue-600 underline mx-1">
          {part}
        </Link>
      ) : (
        <span key={i} className="text-gray-500 mx-1">[[{part}]]</span>
      );
    });
  };

  // 🔁 被リンクノートを抽出
  const backlinks = notes.filter(n => n.backlinks?.includes(note.id));

  return (
    <div className="p-4 py-2 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">{note.title}</h1>
        <Link
          to={`/edit/${note.id}`}
          className="inline-block mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          ✏️ 編集する
        </Link>

        <div className="prose whitespace-pre-wrap">{parseLinks(note.content)}</div>
      </div>

      {backlinks.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">🔁 このノートを参照しているノート</h2>
          <ul className="list-disc list-inside text-blue-700">
            {backlinks.map(bn => (
              <li key={bn.id}>
                <Link to={`/note/${bn.id}`} className="underline hover:text-blue-900">
                  {bn.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
