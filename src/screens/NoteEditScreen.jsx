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

  const renderMarkdown = (text) => {
    // [[Wiki]] をリンクに変換
    const replaced = text.replace(/\[\[([^\]]+)\]\]/g, (_, p1) => {
      const target = notes.find(n => n.title === p1);
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
    const blob = new Blob(
      [`${title}\n\n${content}`],
      { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${title || "note"}.txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 🔹 プレビュー用：[[リンク]]をLink化
  const parseLinks = (text) => {
    const parts = text.split(/\[\[|\]\]/);
    return parts.map((part, i) => {
      if (i % 2 === 0) return <span key={i}>{part}</span>;
      const target = notes.find(n => n.title === part);
      return target ? (
        <Link key={i} to={`/edit/${target.id}`} className="text-blue-600 underline mx-1">
          {part}
        </Link>
      ) : (
        <span key={i} className="text-gray-500 mx-1">[[{part}]]</span>
      );
    });
  };

  const extractTags = (text) => {
    const matches = text.match(/[＃#]([^\s#]+)/g) || []
    return [...new Set(matches.map(tag => tag.slice(1)))]; // '#タグ' → 'タグ'
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

      <textarea
        placeholder="内容"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="border px-3 py-2 w-full h-40"
      />

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

      {/* 🪞 リアルタイムプレビュー表示 */}
      <div className="mt-8 border-t pt-4">
        <h2 className="text-lg font-semibold mb-2">🔍 リンクプレビュー</h2>
        <div className="prose whitespace-pre-wrap">
          {/* 🪞 リアルタイムプレビュー表示 */}

            <h2 className="text-lg font-semibold mb-2">📝 Markdown プレビュー</h2>
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
            </div>


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
    </div>
  );
}
