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
  const [mode, setMode] = useState("edit");
  const [textareaHeight, setTextareaHeight] = useState(() => {
    return localStorage.getItem("textareaHeight") || "200";
  });

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

      {/* モード切替ボタン */}
      <div className="flex gap-3 text-sm mb-2">
        <button onClick={() => setMode("edit")} className={mode === "edit" ? "font-bold underline" : ""}>
          ✏️ 編集 (Ctrl+1)
        </button>
        <button onClick={() => setMode("preview")} className={mode === "preview" ? "font-bold underline" : ""}>
          👁 プレビュー (Ctrl+2)
        </button>
        <button onClick={() => setMode("split-right")} className={mode === "split-right" ? "font-bold underline" : ""}>
          ↔ 横 (Ctrl+3)
        </button>
        <button onClick={() => setMode("split-bottom")} className={mode === "split-bottom" ? "font-bold underline" : ""}>
          ↕ 縦 (Ctrl+4)
        </button>
      </div>

      {/* 各モードの内容 */}
      {mode === "edit" && (
        <>
         
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ height: `${textareaHeight}px` }}
            className="border px-3 py-2 w-full"
            placeholder="内容"
          />
           <div className="flex items-center gap-2 text-sm mb-1">
            <span className="text-gray-500">高さ:</span>
            <input
              type="range"
              min="100"
              max="800"
              value={textareaHeight}
              onChange={(e) => {
                setTextareaHeight(e.target.value);
                localStorage.setItem("textareaHeight", e.target.value);
              }}
              className="w-40"
            />
            <span>{textareaHeight}px</span>
          </div>
        </>
      )}

      {mode === "preview" && (
        <div
          className="prose prose-sm max-w-none border p-3 rounded bg-white"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}

      {mode === "split-right" && (
        <div className="flex gap-4 items-start">
          <div className="flex-1 space-y-2">

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ height: `${textareaHeight}px` }}
              className="border px-3 py-2 w-full"
            />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">高さ:</span>
              <span>{textareaHeight}px</span>
            </div>
            <input
              type="range"
              min="100"
              max="800"
              value={textareaHeight}
              onChange={(e) => {
                setTextareaHeight(e.target.value);
                localStorage.setItem("textareaHeight", e.target.value);
              }}
              className="w-32"
            />
          </div>
          <div
            className="flex-1 prose prose-sm max-w-none border p-3 rounded bg-white overflow-auto"
            style={{ height: `${textareaHeight}px` }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
      )}

      {mode === "split-bottom" && (
        <div className="flex flex-col gap-2">
          
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ height: `${textareaHeight}px` }}
            className="border px-3 py-2 w-full"
          />
          <div
            className="prose prose-sm max-w-none border p-3 rounded bg-white"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">高さ:</span>
            <input
              type="range"
              min="100"
              max="800"
              value={textareaHeight}
              onChange={(e) => {
                setTextareaHeight(e.target.value);
                localStorage.setItem("textareaHeight", e.target.value);
              }}
              className="w-40"
            />
            <span>{textareaHeight}px</span>
          </div>
        </div>
      )}

      {/* 操作ボタン */}
      <div className="flex gap-4 mt-4 flex-wrap">
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

      {/* タグ表示 */}
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
