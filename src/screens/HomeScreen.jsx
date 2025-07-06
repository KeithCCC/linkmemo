import { useNotesContext } from "../context/NotesContext";
import { Link } from "react-router-dom";

export default function HomeScreen() {
  const { notes } = useNotesContext();

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>ノート一覧 🗂️</h1>
      <ul>
        {notes.map((note) => (
          <li key={note.id} style={{ marginBottom: "8px" }}>
            <Link
              to={`/note/${note.id}`}
              style={{
                color: "blue",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              {note.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
