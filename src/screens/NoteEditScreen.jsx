// ✅ NoteEditScreen.jsx 見出しと本文を別々に描画版

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useNotesContext } from "../context/NotesContext";
import MarkdownIt from "markdown-it";
import { updateNote, getNoteById } from "../notesService";
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const md = new MarkdownIt({ breaks: true });

const splitTitleBody = (text) => {
  const lines = (text ?? "").split(/\r?\n/);
  const title = (lines[0] || "新ノート").trim();
  const body = lines.slice(1).join("\n");
  return { title, body };
};

export default function NoteEditScreen({ user }) {
  const { notes, addNote, deleteNote } = useNotesContext();
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem("noteFontSize") || "base";
  });

  const textSizeCls =
    fontSize === "sm" ? "text-sm" :
      fontSize === "lg" ? "text-lg" :
        fontSize === "xl" ? "text-xl" : "text-base";

  const proseSizeCls =
    fontSize === "sm" ? "prose-sm" :
      fontSize === "lg" ? "prose-lg" :
        fontSize === "xl" ? "prose-xl" : "prose";

  const [content, setContent] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState(() => (isNew ? "edit" : localStorage.getItem("noteViewMode") || "preview"));

  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const noteIdRef = useRef(id === "new" ? null : id);
  const isSyncingScroll = useRef(false);

  const changeFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem("noteFontSize", size);
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    localStorage.setItem("noteViewMode", newMode);
  };

  const handleDownload = () => {
    const safeTitle = content.split("\n")[0] || "note";
    const blob = new Blob([`${safeTitle}\n\n${content}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeTitle}.txt`;
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
    return [...new Set(matches.map(t => t.slice(1).toLowerCase()))];
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (noteIdRef.current) {
        triggerAutoSave(newContent);
      } else {
        triggerFirstSave(newContent);
      }
    }, 2000);
  };

  const triggerFirstSave = async (firstContent) => {
    if (!user?.uid) return;
    const title = firstContent.split("\n")[0] || "無題ノート";
    const tags = extractTags(firstContent);
    const noteData = {
      title,
      content: firstContent,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      const docRef = await addDoc(collection(db, "users", user.uid, "notes"), noteData);
      noteIdRef.current = docRef.id;
      addNote({ id: docRef.id, ...noteData });
      navigate(`/edit/${docRef.id}`, { replace: true });
    } catch (err) {
      console.error("初回保存失敗:", err);
    }
  };

  const triggerAutoSave = async (autoContent) => {
    if (!user?.uid || !noteIdRef.current) return;
    setIsSaving(true);
    const title = autoContent.split("\n")[0] || "無題ノート";
    const tags = extractTags(autoContent);
    const noteData = {
      title,
      content: autoContent,
      tags,
      updatedAt: new Date().toISOString(),
    };
    try {
      await updateNote(user.uid, noteIdRef.current, noteData);
      addNote({ id: noteIdRef.current, ...noteData });
    } catch (err) {
      console.error("自動保存失敗:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const syncScroll = (source, target) => {
    if (!source.current || !target.current || isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const ratio = source.current.scrollTop / (source.current.scrollHeight - source.current.clientHeight);
    target.current.scrollTop = ratio * (target.current.scrollHeight - target.current.clientHeight);
    setTimeout(() => (isSyncingScroll.current = false), 10);
  };

  const renderMarkdown = (text) => {
    const tags = extractTags(text);
    const withLinks = text.replace(/\[\[([^\]]+)\]\]/g, (_, p1) => {
      const target = notes.find((n) => n.title === p1);
      return target ? `[[LINK-${target.id}|${p1}]]` : `[[${p1}]]`;
    });
    let rendered = md.render(withLinks);
    rendered = rendered.replace(/(^|\s)([#＃][^\s#＃<>]+)/g, (_, pre, tag) => {
      return `${pre}<span class="tag">${tag}</span>`;
    });
    rendered = rendered.replace(/\[\[LINK-([^|\]]+)\|([^\]]+)\]\]/g, (_, id, title) => {
      return `<a href="/edit/${id}" class="text-blue-600 underline">${title}</a>`;
    });
    const tagHTML = tags.length > 0
      ? `<div class="mt-4 border-t pt-2 text-sm text-gray-600">
          <strong>🏷 タグ：</strong> ${tags.map(t => `<span class="tag">#${t}</span>`).join(' ')}
        </div>`
      : "";
    return rendered + tagHTML;
  };

  useEffect(() => {
    if (!isNew && user?.uid) {
      getNoteById(user.uid, id).then(note => {
        if (!note) navigate("/", { replace: true });
        else setContent(note.content || "");
      });
    }
  }, [id, isNew, user]);

  const { title, body } = splitTitleBody(content);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="note-title">
          {title}
          <span className="ml-2 text-sm text-gray-500">
            （ID: {noteIdRef.current ?? "未保存"}）
          </span>
        </h1>

        {noteIdRef.current && (
          <div className="flex items-center justify-end gap-2">
            <button onClick={handleDownload} className="bg-gray-600 text-white px-3 py-0.5 text-sm rounded hover:bg-gray-700">
              テキスト保存
            </button>
            <button onClick={handleExportMarkdown} className="bg-orange-500 text-white px-4 py-0.5 rounded hover:bg-orange-600">
              Markdown保存
            </button>
            <button
              onClick={async () => {
                if (confirm("このノートを削除してもよろしいですか？")) {
                  await deleteNote(noteIdRef.current);
                  navigate("/", { replace: true });
                }
              }}
              className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700"
            >
              削除
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3 text-sm mb-2">
        <button onClick={() => changeMode("edit")} className={mode === "edit" ? "font-bold underline" : ""}>✏️ 編集</button>
        <button onClick={() => changeMode("preview")} className={mode === "preview" ? "font-bold underline" : ""}>👁 プレビュー</button>
        <button onClick={() => changeMode("split-right")} className={mode === "split-right" ? "font-bold underline" : ""}>↔ 横</button>
        <span>|文字サイズ：</span>
        <button onClick={() => changeFontSize("sm")} className={fontSize === "sm" ? "font-bold underline" : ""}>小</button>
        <button onClick={() => changeFontSize("base")} className={fontSize === "base" ? "font-bold underline" : ""}>標準</button>
        <button onClick={() => changeFontSize("lg")} className={fontSize === "lg" ? "font-bold underline" : ""}>大</button>
        <button onClick={() => changeFontSize("xl")} className={fontSize === "xl" ? "font-bold underline" : ""}>特大</button>
        {isSaving && <span className="text-yellow-600 text-sm ml-4">💾保存中...</span>}
        {saveSuccess && <span className="text-green-600 text-sm ml-4">✅保存！</span>}
      </div>

      {mode === "edit" && (
        <textarea
          ref={textareaRef}
          value={content} // ← 本文はタイトル込みで表示
          onChange={handleContentChange}
          className={`w-full border-none outline-none px-2 py-1 ${textSizeCls} leading-tight bg-transparent`}
          style={{ height: "calc(100vh - 300px)" }}
          placeholder="内容を入力..."
        />
      )}

      {mode === "preview" && (
        <>
          <h1 className="note-title">
            {title}
            {/* <span className="ml-2 text-sm text-gray-500">
              （ID: {noteIdRef.current ?? "未保存"}）
            </span> */}
          </h1>
          <div
            className={`prose max-w-3xl mx-auto px-4 py-2 text-left overflow-auto ${proseSizeCls}`}
            style={{ height: "calc(100vh - 300px)" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
          />
        </>
      )}

      {mode === "split-right" && (
        <div className="flex h-full gap-4">
          {/* 左：エディタ（タイトル行も含む全文） */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onScroll={() => syncScroll(textareaRef, previewRef)}
              className={`w-full border-none outline-none px-2 py-1 ${textSizeCls} leading-tight bg-transparent`}
              style={{ height: "calc(100vh - 300px)" }}
            />
          </div>

          {/* 右：プレビュー（見出し＋本文） */}
          <div
            ref={previewRef}
            onScroll={() => syncScroll(previewRef, textareaRef)}
            className={`flex-1 prose max-w-3xl mx-auto px-4 py-2 text-left overflow-auto border-gray-500 bg-yellow-50 rounded ${proseSizeCls}`}
            style={{
              minHeight: "200px",
              maxHeight: "calc(100vh - 200px)",
              overflowY: "auto",
              resize: "none",
            }}
          >
            {/* タイトルはh1で個別描画 */}
            <h1 className="note-title">{title}</h1>

            {/* 本文だけをMarkdownレンダリング */}
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
          </div>
        </div>
      )}

    </div>
  );
}
