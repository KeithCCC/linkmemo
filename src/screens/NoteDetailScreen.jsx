// src/screens/NoteDetailScreen.jsx
import { useParams } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";

export default function NoteDetailScreen() {
  const { id } = useParams();
  const { getNoteById } = useNotesContext();

  const note = getNoteById(id);

  if (!note) {
    return <h2>ノートが見つかりませんでした（ID: {id}）</h2>;
  }

  return (
    <div>
      <h1>{note.title}</h1>
      <p>{note.content}</p>
    </div>
  );
}
