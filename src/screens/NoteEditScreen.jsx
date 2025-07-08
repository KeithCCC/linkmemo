import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useNotesContext } from "../context/NotesContext";

export default function NoteEditScreen() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { addNote, updateNote, deleteNote, getNoteById } = useNotesContext();

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

  const handleDelete = () => {
    const confirmDelete = window.confirm("このノートを本当に削除しますか？");
    if (confirmDelete) {
      deleteNote(id);
      navigate("/");
    }
  };

  const handleDownload = () => {
    const blob = new Blob(
      [`${title}\n\n${content}`],
      { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${title || "note"}.txt`; // タイトルをファイル名に

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          保存
        </button>

        {!isNew && (
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            削除
          </button>
        )}

        <button
          onClick={handleDownload}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          ファイルとして保存
        </button>
      </div>
    </div>
  );
}
