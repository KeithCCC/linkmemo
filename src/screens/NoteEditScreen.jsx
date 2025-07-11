// src/screens/NoteEditScreen.jsx
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useNotesContext } from "../context/NotesContext";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt();

export default function NoteEditScreen() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { addNote, updateNote, deleteNote, getNoteById, notes } = useNotesContext();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mode, setMode] = useState("edit"); // 🔁 表示モード: edit, preview, split-right, split-bottom

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
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.ctrlKey) {
      switch (e.key) {
        case "1":
          setMode("edit");
          e.preventDefault();
          break;
        case "2":
          setMode("preview");
          e.preventDefault();
          break;
        case "3":
          setMode("split-right");
          e.preventDefault();
          break;
        case "4":
          setMode("split-bottom");
          e.preventDefault();
          break;
        default:
          break;
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);

  const renderMarkdown = (text) => {
    const replaced = text.replace(/\[\[([^\]]+)\]\]/g, (_, p1) => {
      const target = notes.find((n) => n.title === p1);
      return target
        ? `<a href="/edit/${target.id}" class="text-blue-600 underline">${p1}</a>`
        : `<span class="text-gray-400">[[${p1}]]</span>`;
    });
    return md.render(replaced);
  };

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
    const blob = new Blob([`${title}\n\n${content}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "note"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const extractTags = (text) => {
    const matches = text.match(/[＃#]([^\s#]+)/g) || [];
    return [...new Set(matches.map((tag) => tag.slice(1)))];
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">
        {isNew ? "新規ノート作成" : `ノート編集（ID: ${id}）`}
      </h1>

      <input
        type="text"
        placeholder="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border px-3 py-2 w-full"
      />

      {/* 🔁 表示モード選択 */}
<div className="flex gap-2 text-sm mb-2">
  <button onClick={() => setMode("edit")}>✏️ 編集 <span className="text-gray-400">(Ctrl+1)</span></button>
  <button onClick={() => setMode("preview")}>👁 プレビュー <span className="text-gray-400">(Ctrl+2)</span></button>
  <button onClick={() => setMode("split-right")}>↔ 横並び <span className="text-gray-400">(Ctrl+3)</span></button>
  <button onClick={() => setMode("split-bottom")}>↕ 縦並び <span className="text-gray-400">(Ctrl+4)</span></button>
</div>


      {/* ✍ 表示内容の切り替え */}
      {mode === "edit" && (
        <textarea
          placeholder="内容"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border px-3 py-2 w-full h-40"
        />
      )}

      {mode === "preview" && (
        <div
          className="prose prose-sm max-w-none border p-3 rounded bg-white"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}

      {mode === "split-right" && (
        <div className="grid grid-cols-2 gap-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="border px-3 py-2 w-full h-40"
          />
          <div
            className="prose prose-sm max-w-none border p-3 rounded bg-white"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
      )}

      {mode === "split-bottom" && (
        <div className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="border px-3 py-2 w-full h-40"
          />
          <div
            className="prose prose-sm max-w-none border p-3 rounded bg-white"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
      )}

      {/* ✅ 操作ボタン群 */}
      <div className="flex gap-4">
        <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          保存
        </button>
        {!isNew && (
          <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            削除
          </button>
        )}
        <button onClick={handleDownload} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
          ファイルとして保存
        </button>
      </div>

      {/* 🏷️ タグ表示 */}
      {extractTags(content).length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-1">タグ:</h3>
          <div className="flex flex-wrap gap-2">
            {extractTags(content).map((tag) => (
              <span key={tag} className="bg-gray-200 text-sm px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
