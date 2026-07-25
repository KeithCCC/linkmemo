import { Link } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";

export default function HomeScreen() {
  const { visibleNotes = [] } = useNotesContext();
  return (
    <div className="app-page-tight">
      <section className="app-reading-surface p-6">
        <h1 className="text-xl font-bold">Notes</h1>
        {visibleNotes.length === 0 ? (
          <p className="mt-3 app-muted-text">No notes in this workspace.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {visibleNotes.map((note) => (
              <li key={note.id}>
                <Link to={`/edit/${note.id}`} className="text-blue-700 underline">{note.title || "Untitled"}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
