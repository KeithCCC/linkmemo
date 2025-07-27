// ✅ NoteEditScreen.jsx 完全修正版（自動保存・新規ノート対応）

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useNotesContext } from "../context/NotesContext";
import MarkdownIt from "markdown-it";
import { updateNote, getNoteById, deleteNote } from "../notesService";
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const md = new MarkdownIt({ breaks: true });

export default function NoteEditScreen({ user }) {
  const { notes, addNote } = useNotesContext();
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();

  const [content, setContent] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState(() => (isNew ? "edit" : localStorage.getItem("noteViewMode") || "preview"));

  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const noteIdRef = useRef(id === "new" ? null : id);
  const isSyncingScroll = useRef(false);

  const changeMode = (newMode) => {
    setMode(newMode);
    localStorage.setItem("noteViewMode", newMode);
  };

  const extractTags = (text) => {
    const matches = text.match(/[＃#]([^\s#]+)/g) || [];
    return [...new Set(matches.map((tag) => tag.slice(1)))];
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
    const replaced = text.replace(/\[\[([^\]]+)\]\]/g, (_, p1) => {
      const target = notes.find((n) => n.title === p1);
      return target ? `<a href="/edit/${target.id}" class="text-blue-600 underline">${p1}</a>` : `<span class="text-gray-400">[[${p1}]]</span>`;
    });
    const lines = replaced.split("\n");
    if (lines[0]) lines[0] = `**${lines[0]}**`;
    return md.render(lines.join("\n"));
  };

  useEffect(() => {
    if (!isNew && user?.uid) {
      getNoteById(user.uid, id).then(note => {
        if (!note) navigate("/", { replace: true });
        else setContent(note.content || "");
      });
    }
  }, [id, isNew, user]);

  return (
    <div className="p-4 space-y-4 text-base sm:text-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">
          {noteIdRef.current ? `ノート編集（ID: ${noteIdRef.current}）` : "新規ノート作成"}
        </h1>

        {isSaving && <span className="text-yellow-600 text-sm ml-4">💾 自動保存中...</span>}
        {saveSuccess && <span className="text-green-600 text-sm ml-4">✅ 保存しました！</span>}
      </div>
      <div className="flex gap-3 text-sm mb-2">
        <button onClick={() => changeMode("edit")} className={mode === "edit" ? "font-bold underline" : ""}>✏️ 編集</button>
        <button onClick={() => changeMode("preview")} className={mode === "preview" ? "font-bold underline" : ""}>👁 プレビュー</button>
        <button onClick={() => changeMode("split-right")} className={mode === "split-right" ? "font-bold underline" : ""}>↔ 横</button>
      </div>

      {/* エディタ */}
      {mode === "edit" && (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          className="w-full border px-3 py-2 border-gray-500"
          style={{ height: "calc(100vh - 300px)" }}
          placeholder="内容を入力..."
        />
      )}

      {mode === "preview" && (
        <div
          className="prose max-w-3xl mx-auto px-4 py-2 text-base text-left overflow-auto"
          style={{ height: "calc(100vh - 300px)" }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}

      {mode === "split-right" && (
        <div className="flex h-full gap-4">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onScroll={() => syncScroll(textareaRef, previewRef)}
              className="border px-3 py-2 w-full resize-y border-gray-500"
              style={{ height: "calc(100vh - 300px)" }}
            />
          </div>
          <div
            ref={previewRef}
            onScroll={() => syncScroll(previewRef, textareaRef)}
            className="flex-1 prose max-w-3xl mx-auto px-4 py-2 text-base text-left overflow-auto border border-gray-500 bg-white rounded"
            style={{ height: "calc(100vh - 300px)" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
      )}
    </div>
  );
}
