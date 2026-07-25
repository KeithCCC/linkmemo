import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MarkdownIt from "markdown-it";
import { folderPath, useNotesContext } from "../context/NotesContext";
import { addRecentNote } from "../recentNotes";

const markdown = new MarkdownIt({ breaks: true, linkify: true });

function deriveTitle(content, fallback = "Untitled") {
  const heading = String(content ?? "").match(/^\s*#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback || "Untitled";
}

function extractTags(content) {
  return [...new Set([...String(content ?? "").matchAll(/(?:^|\s)#([^\s#]+)/gu)].map((match) => match[1]))];
}

function wikiTitles(content) {
  return [...new Set([...String(content ?? "").matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1].trim()).filter(Boolean))];
}

export function WikiLinks({ content, note, notes, folders, navigate }) {
  const titles = wikiTitles(content);
  if (titles.length === 0) return null;
  return (
    <section aria-label="Wiki links" className="mt-3 rounded-2xl border app-panel p-3">
      <div className="app-section-title mb-2">Wiki links</div>
      <div className="flex flex-wrap items-center gap-2">
        {titles.map((title) => {
          const matches = notes.filter((candidate) => candidate.id !== note.id && candidate.title === title);
          const sameFolder = matches.filter((candidate) => candidate.source !== "legacy" && candidate.parentId === note.parentId);
          const candidates = sameFolder.length > 0 ? sameFolder : matches;
          if (candidates.length === 1) {
            return <a key={title} href={`/edit/${candidates[0].id}`} className="app-chip rounded-full px-3 py-1 text-sm text-blue-700"> {title} </a>;
          }
          if (candidates.length > 1) {
            return (
              <select
                key={title}
                aria-label={`Choose note for [[${title}]]`}
                defaultValue=""
                onChange={(event) => event.target.value && navigate(`/edit/${event.target.value}`)}
                className="rounded-xl border app-input px-3 py-2 text-sm"
              >
                <option value="" disabled>{title} — choose note</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {folderPath(folders, candidate.parentId)} — {candidate.title}
                  </option>
                ))}
              </select>
            );
          }
          return <span key={title} className="app-chip rounded-full px-3 py-1 text-sm app-muted-text">[[{title}]]</span>;
        })}
      </div>
    </section>
  );
}

function ReadOnlyNote({ note, folders, copyLegacyToNotehub, navigate }) {
  const isLegacy = note.source === "legacy";
  const isGoogleDoc = note.source === "drive-doc";
  const copy = async () => {
    const id = await copyLegacyToNotehub(note.id);
    if (id) navigate(`/edit/${id}`);
  };
  return (
    <div className="app-page-tight">
      <section className="app-reading-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="app-section-title">{isLegacy ? "Legacy" : "Drive"}</div>
            <h1 className="mt-2 text-2xl font-black">{note.title || "Untitled"}</h1>
            {!isLegacy && <div className="mt-2 text-sm app-muted-text">{folderPath(folders, note.parentId)}</div>}
            <div className="mt-1 text-sm font-semibold text-amber-700">
              {isLegacy ? "Read-only Legacy note" : isGoogleDoc ? "Read-only Google Doc" : "Read-only Drive file"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isLegacy && <button type="button" onClick={copy} className="app-primary-button">Copy to Notehub</button>}
            {isGoogleDoc && (
              <a
                href={`https://docs.google.com/document/d/${encodeURIComponent(note.id)}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="app-primary-button"
              >
                Open in Google Docs
              </a>
            )}
            <button type="button" onClick={() => navigate("/")} className="app-secondary-button">Back to list</button>
          </div>
        </div>
        <div
          className="prose dark:prose-invert mt-6 max-w-none rounded-2xl border app-panel p-5"
          dangerouslySetInnerHTML={{ __html: markdown.render(note.content ?? "") }}
        />
      </section>
    </div>
  );
}

export default function NoteEditScreen({ toggleListVisibility, setNavCollapsed }) {
  const { id = "new" } = useParams();
  const navigate = useNavigate();
  const {
    notes = [],
    folders = [],
    syncState = "offline",
    currentWorkspace,
    getNoteById,
    createDriveNote,
    updateDriveNote,
    moveDriveNote,
    trashDriveNote,
    copyLegacyToNotehub,
  } = useNotesContext();
  const isNew = id === "new";
  const note = isNew ? null : getNoteById(id);
  const [content, setContent] = useState("");
  const [focus, setFocus] = useState(false);
  const [parentId, setParentId] = useState(null);
  const [mode, setMode] = useState(() => localStorage.getItem("noteViewMode") || "edit");
  const [saveState, setSaveState] = useState(isNew ? "unsaved" : "saved");
  const [showTools, setShowTools] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isNew) {
      setContent("");
      setFocus(false);
      setParentId(currentWorkspace?.type === "folder" ? currentWorkspace.folderId : null);
      setSaveState("unsaved");
      requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }
    if (!note) return;
    setContent(note.content ?? "");
    setFocus(Boolean(note.focus));
    setParentId(note.parentId ?? null);
    setSaveState("saved");
    addRecentNote({ id: note.id, title: note.title || "Untitled" });
  }, [currentWorkspace?.folderId, currentWorkspace?.type, id, isNew, note?.id]);

  useEffect(() => {
    localStorage.setItem("noteViewMode", mode);
  }, [mode]);

  const workingNote = useMemo(() => ({
    ...(note ?? {}),
    id: note?.id ?? "new",
    title: deriveTitle(content, note?.title),
    content,
    parentId,
    source: "drive-markdown",
    editable: true,
  }), [content, note, parentId]);

  const save = useCallback(async () => {
    setSaveState("saving");
    try {
      const patch = {
        title: deriveTitle(content, note?.title),
        content,
        tags: extractTags(content),
        focus,
      };
      if (isNew) {
        const createdId = await createDriveNote({ ...patch, parentId });
        setSaveState("saved");
        if (createdId) navigate(`/edit/${createdId}`, { replace: true });
        return createdId;
      }
      await updateDriveNote(note.id, patch);
      setSaveState("saved");
      return note.id;
    } catch {
      setSaveState("error");
      return null;
    }
  }, [content, createDriveNote, focus, isNew, navigate, note, parentId, updateDriveNote]);

  useEffect(() => {
    if (saveState !== "unsaved" || !content.trim()) return undefined;
    const timer = window.setTimeout(() => void save(), 900);
    return () => window.clearTimeout(timer);
  }, [content, focus, save, saveState]);

  useEffect(() => {
    const exportText = () => {
      const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${deriveTitle(content, note?.title)}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    };
    window.addEventListener("asuka-export-text", exportText);
    return () => window.removeEventListener("asuka-export-text", exportText);
  }, [content, note?.title]);

  useEffect(() => {
    const keyboard = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === "1") setMode("edit");
      if (event.key === "2") setMode("preview");
      if (event.key === "3") setMode("split-right");
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);

  if (!isNew && !note) {
    return (
      <div className="app-empty-state">
        <h1 className="text-xl font-bold">This note is not available in the local cache.</h1>
        <button type="button" onClick={() => navigate("/")} className="app-primary-button mt-4">Back to notes</button>
      </div>
    );
  }

  if (note && (note.source !== "drive-markdown" || note.editable === false)) {
    return <ReadOnlyNote note={note} folders={folders} copyLegacyToNotehub={copyLegacyToNotehub} navigate={navigate} />;
  }

  const changeContent = (value) => {
    setContent(value);
    setSaveState("unsaved");
  };
  const changeFocus = () => {
    setFocus((current) => !current);
    setSaveState("unsaved");
  };
  const move = async (destination) => {
    if (isNew) {
      setParentId(destination || null);
      return;
    }
    await moveDriveNote(note.id, destination || null);
    setParentId(destination || null);
  };
  const trash = async () => {
    if (!note || !window.confirm("Trash this note?")) return;
    await trashDriveNote(note.id);
    navigate("/", { replace: true });
  };
  const wrapLines = (prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.slice(0, start);
    const selected = content.slice(start, end) || content.slice(start).split("\n")[0];
    const afterStart = end === start ? start + selected.length : end;
    const changed = `${before}${selected.split("\n").map((line) => `${prefix}${line}`).join("\n")}${content.slice(afterStart)}`;
    changeContent(changed);
  };
  const saveLabel = saveState === "saving"
    ? "Saving locally…"
    : saveState === "saved"
      ? (syncState === "pending" ? "Saved locally · Pending sync" : "Saved locally")
      : saveState === "error"
        ? "Save error"
        : "Unsaved changes";
  const preview = <div className="preview-pane prose dark:prose-invert max-w-none flex-1 overflow-auto rounded-2xl border app-panel p-4" dangerouslySetInnerHTML={{ __html: markdown.render(content) }} />;

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col overflow-hidden">
      <header className="rounded-2xl border app-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black">{deriveTitle(content, note?.title)}</h1>
            <div className="mt-1 flex flex-wrap gap-2 text-xs app-muted-text">
              <span>{folderPath(folders, parentId)}</span>
              <span aria-live="polite">{saveLabel}</span>
              <span>Sync: {syncState}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => navigate("/edit/new")} className="app-primary-button text-sm">New note</button>
            <button type="button" onClick={changeFocus} aria-pressed={focus} className="app-secondary-button text-sm">{focus ? "Focus ON" : "Focus OFF"}</button>
            {!isNew && <button type="button" aria-label="Trash note" onClick={trash} className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white">Trash</button>}
            <button type="button" onClick={save} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm text-white">Save</button>
            <button type="button" onClick={() => { setNavCollapsed?.(true); navigate("/"); }} className="app-secondary-button text-sm">Back to list</button>
            <button type="button" aria-label="Toggle sidebar" onClick={() => toggleListVisibility?.()} className="app-secondary-button text-sm">Toggle sidebar</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="app-toolbar-segment">
            <button type="button" className={mode === "edit" ? "is-active" : ""} onClick={() => setMode("edit")}>Edit</button>
            <button type="button" className={mode === "preview" ? "is-active" : ""} onClick={() => setMode("preview")}>Preview</button>
            <button type="button" className={mode === "split-right" ? "is-active" : ""} onClick={() => setMode("split-right")}>Split</button>
          </div>
          <button type="button" onClick={() => setShowTools((current) => !current)} className="app-secondary-button text-sm">More tools</button>
          <label className="text-xs app-muted-text" htmlFor="note-folder">Move to</label>
          <select
            id="note-folder"
            aria-label="Move note to folder"
            value={parentId ?? ""}
            onChange={(event) => void move(event.target.value)}
            className="rounded-xl border app-input px-3 py-2 text-sm"
          >
            <option value="">Notehub root</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folderPath(folders, folder.id)}</option>)}
          </select>
        </div>
        {showTools && (
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => wrapLines("- ")} className="app-chip rounded-lg px-3 py-1 text-xs">Bullets</button>
            <button type="button" onClick={() => wrapLines("- [ ] ")} className="app-chip rounded-lg px-3 py-1 text-xs">Checklist</button>
          </div>
        )}
      </header>

      <main className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
        {mode === "edit" && (
          <textarea
            ref={textareaRef}
            aria-label="Markdown content"
            value={content}
            onChange={(event) => changeContent(event.target.value)}
            placeholder="Write your note…"
            className="min-h-[45vh] w-full flex-1 resize-none rounded-2xl border app-input p-4 font-mono leading-relaxed"
          />
        )}
        {mode === "preview" && preview}
        {mode === "split-right" && (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
            <textarea
              ref={textareaRef}
              aria-label="Markdown content"
              value={content}
              onChange={(event) => changeContent(event.target.value)}
              className="min-h-[40vh] w-full resize-none rounded-2xl border app-input p-4 font-mono leading-relaxed"
            />
            {preview}
          </div>
        )}
      </main>
      <WikiLinks content={content} note={workingNote} notes={notes} folders={folders} navigate={navigate} />
    </div>
  );
}
