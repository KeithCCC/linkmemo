import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useNotesContext } from "../context/NotesContext";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  breaks: true, // ← これで改行を <br> に変換！
});

export default function NoteEditScreen() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { addNote, updateNote, deleteNote, getNoteById, notes } = useNotesContext();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const textareaRef = useRef(null);
  const [previewHeight, setPreviewHeight] = useState(() => {
    return parseInt(localStorage.getItem("textareaHeight")) || 200;
  });

  const [textareaHeight, setTextareaHeight] = useState(() => {
    return parseInt(localStorage.getItem("textareaHeight")) || 200;
  });

  const [mode, setMode] = useState(() => {
    if (id === "new") return "edit"; // 新規ノート時は強制的に編集モード
    return localStorage.getItem("noteViewMode") || "edit-only";
  });

  const changeMode = (newMode) => {
    setMode(newMode);
    localStorage.setItem("noteViewMode", newMode);
  };

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (textareaRef.current) {
        const newHeight = textareaRef.current.offsetHeight;
        setPreviewHeight(newHeight); // プレビューに反映
        localStorage.setItem("textareaHeight", newHeight); // ← 保存！
      }
    });

    if (textareaRef.current) {
      observer.observe(textareaRef.current);
    }

    return () => observer.disconnect();
  }, []);


  useEffect(() => {
    if (!isNew) {
      const existingNote = getNoteById(id);

      if (!existingNote) {
        // アラートなしで静かにリダイレクト（推奨）
        // どうしてもアラートを残したければ中に書く
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 0);
        return; // ← 以降の処理を止める
      }

      // ノートが存在するときのみセット
      setTitle(existingNote.title);
      setContent(existingNote.content);
    }
  }, [id, isNew, getNoteById, navigate]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case "1":
            changeMode("edit");
            e.preventDefault();
            break;
          case "2":
            changeMode("preview");
            e.preventDefault();
            break;
          case "3":
            changeMode("split-right");
            e.preventDefault();
            break;
          case "4":
            changeMode("split-bottom");
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

    const lines = replaced.split("\n");
    if (lines.length > 0 && lines[0].trim() !== "") {
      lines[0] = `**${lines[0]}**`;
    }

    return md.render(lines.join("\n"));
  };

  const handleSave = () => {
    const firstLine = content.split("\n")[0].trim(); // ← 1行目を抽出
    const noteTitle = firstLine || "無題ノート";

    if (isNew) {
      addNote({ title: noteTitle, content });
    } else {
      updateNote(id, { title: noteTitle, content });
    }
    navigate("/");
  };

  const handleDelete = () => {
    const confirmDelete = window.confirm("このノートを本当に削除しますか？");
    if (confirmDelete) {
      deleteNote(id);
      navigate("/", { replace: true });
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

  const handleExportMarkdown = () => {
    const filename = (content.split("\n")[0] || "note") + ".md";
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
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
    <div className="p-4 space-y-4 text-base sm:text-sm">
      <h1 className="text-lg sm:text-base font-bold">
        {isNew ? "新規ノート作成" : `ノート編集（ID: ${id}）`}
      </h1>

      {/* モード切替ボタン */}
      <div className="flex gap-3 text-sm mb-2">
        <button onClick={() => changeMode("edit")} className={mode === "edit" ? "font-bold underline" : ""}>
          ✏️ 編集 (Ctrl+1)
        </button>
        <button onClick={() => changeMode("preview")} className={mode === "preview" ? "font-bold underline" : ""}>
          👁 プレビュー (Ctrl+2)
        </button>
        <button onClick={() => changeMode("split-right")} className={mode === "split-right" ? "font-bold underline" : ""}>
          ↔ 横 (Ctrl+3)
        </button>
        <button onClick={() => changeMode("split-bottom")} className={mode === "split-bottom" ? "font-bold underline" : ""}>
          ↕ 縦 (Ctrl+4)
        </button>
      </div>

      <div className="space-y-2">

        {/* 各モードの内容 */}
        {mode === "edit" && (
          <>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border resize-none px-3 py-2 border-gray-500"
              style={{ height: "calc(100vh - 220px)" }} // ← 上部ヘッダーやボタン分を引く
              // style={{ height: `${textareaHeight}px` }}
              // className="border px-3 py-2 w-full border-gray-500"
              placeholder="内容"
            />
          </>
        )}

      </div>

      {mode === "preview" && (
        <div
          // className="prose prose-sm max-w-none border p-3 rounded bg-white border-gray-500"
          // dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          className="prose prose-sm max-w-none border p-3 rounded bg-white border-gray-500 overflow-auto"
          style={{ height: "calc(100vh - 200px)" }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}

      {mode === "split-right" && (
        <div className="flex h-full gap-4">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border px-3 py-2 w-full resize-y border-gray-500"
              style={{ height: "calc(100vh - 200px)" }}
            />
          </div>
          <div
            className="flex-1 prose prose-sm max-w-none border p-3 rounded bg-white overflow-auto border-gray-500"
            style={{ height: "calc(100vh - 200px)" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
        // <div className="flex h-full gap-4">

        //   <div className="flex-1 space-y-2 h-full border-gray-500">
        //     <textarea
        //       ref={textareaRef}
        //       value={content}
        //       onChange={(e) => setContent(e.target.value)}
        //       className="border px-3 py-2 w-full resize-y border-gray-500"
        //       style={{ height: `${previewHeight}px` }}
        //     />
        //   </div>
        //   <div
        //     className="flex-1 prose prose-sm max-w-none border p-3 rounded bg-white overflow-auto border-gray-500"
        //     style={{ height: `${previewHeight}px` }}
        //     dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        //   />
        // </div>
      )}


      {mode === "split-bottom" && (
        <div className="flex flex-col gap-2">

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ height: `${textareaHeight}px` }}
            className="border px-3 py-2 w-full border-gray-500"
          />
          <div
            className="prose prose-sm max-w-none border p-3 rounded bg-white border-gray-500"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
      )}

      {/* 操作ボタン */}
      <div className="flex gap-4 mt-4 flex-wrap">
        <button onClick={handleSave} className="bg-blue-600 text-white  px-3 py-1 text-sm roundedhover:bg-blue-700">
          保存
        </button>
        {!isNew && (
          <button onClick={handleDelete} className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700">
            削除
          </button>
        )}
        <button onClick={handleDownload} className="bg-gray-600 text-white  px-3 py-1 text-sm rounded hover:bg-gray-700">
          ファイルとして保存
        </button>
        <button
          onClick={handleExportMarkdown}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
        >
          Markdownとして保存
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
