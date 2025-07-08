import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useNotesContext } from "../context/NotesContext";

export default function NoteEditScreen() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { addNote, updateNote, getNoteById } = useNotesContext();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!isNew) {
      const existingNote = getNoteById(id);
      if (existingNote) {
        setTitle(existingNote.title);
        setContent(existingNote.content);
      } else {
        alert("ノートが見つかりませんでした");
        navigate("/");
      }
    }
  }, [id, isNew, getNoteById, navigate]);

  const handleSave = () => {
    if (isNew) {
      addNote({ title, content });
    } else {
      updateNote(id, { title, content });
    }
    navigate("/");
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        {isNew ? "新規ノート作成" : `ノート編集（ID: ${id}）`}
      </h1>

      <input
        type="text"
        placeholder="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border px-3 py-2 w-full mb-4"
      />

      <textarea
        placeholder="内容"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="border px-3 py-2 w-full h-40 mb-4"
      />

      <button
        onClick={handleSave}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        保存
      </button>
    </div>
  );
}
