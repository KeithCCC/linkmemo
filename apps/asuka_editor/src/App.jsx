import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { listen } from "@tauri-apps/api/event";

const MODE_LABELS = {
  markdown: "Markdown",
  javascript: "JavaScript",
  json: "JSON",
  yaml: "YAML",
  plain: "Plain text",
};

const DEFAULT_TEXT = `# Asuka Editor

Start typing...

- Markdown preview is on the right.
- Use the mode switcher for JS/JSON/YAML.
`;

const SETTINGS_KEY = "asuka_editor_db_settings";
const DRAFT_KEY = "asuka_editor_draft";

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSettings(next) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

function inferModeFromPath(path) {
  if (!path) return "markdown";
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "md":
    case "markdown":
      return "markdown";
    case "js":
    case "jsx":
    case "mjs":
      return "javascript";
    case "json":
      return "json";
    case "yml":
    case "yaml":
      return "yaml";
    case "txt":
      return "plain";
    default:
      return "markdown";
  }
}

function normalizeBaseUrl(url) {
  return url ? url.replace(/\/+$/, "") : "";
}

export default function App() {
  const [mode, setMode] = useState("markdown");
  const [previewVisible, setPreviewVisible] = useState(true);
  const [dbVisible, setDbVisible] = useState(() => {
    const stored = window.localStorage.getItem("asuka_editor_db_visible");
    return stored ? stored === "true" : true;
  });
  const [value, setValue] = useState(
    window.localStorage.getItem(DRAFT_KEY) || DEFAULT_TEXT
  );
  const [lastSavedValue, setLastSavedValue] = useState(
    window.localStorage.getItem(DRAFT_KEY) || DEFAULT_TEXT
  );
  const [filePath, setFilePath] = useState("");
  const [noteId, setNoteId] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [noteFilter, setNoteFilter] = useState("");
  const [notes, setNotes] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dbSettings, setDbSettings] = useState(() => ({
    supabaseUrl: "https://yyjplaplxpjmaetwakwp.supabase.co",
    anonKey: "",
    accessToken: "",
    userId: "",
    ...loadSettings(),
  }));

  const extensions = useMemo(() => {
    switch (mode) {
      case "javascript":
        return [javascript({ jsx: true })];
      case "json":
        return [json()];
      case "yaml":
        return [yaml()];
      case "plain":
        return [];
      case "markdown":
      default:
        return [markdown()];
    }
  }, [mode]);

  const previewMarkdown =
    mode === "markdown"
      ? value
      : `\
\
\`\`\`${mode === "plain" ? "" : mode}\n${value}\n\`\`\`\n`;

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const isDirty = value !== lastSavedValue;

  useEffect(() => {
    const handler = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    let unlisten;
    listen("tauri://file-drop", async (event) => {
      const paths = event.payload;
      if (Array.isArray(paths) && paths.length) {
        await openFile(paths[0]);
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  function updateStatus(nextStatus, nextError = "") {
    setStatus(nextStatus);
    setError(nextError);
  }

  function handleChange(next) {
    setValue(next);
    window.localStorage.setItem(DRAFT_KEY, next);
  }

  function handleNew() {
    setValue("");
    setNoteTitle("");
    setNoteTags("");
    setNoteId("");
    setFilePath("");
    setMode("markdown");
    setLastSavedValue("");
    window.localStorage.setItem(DRAFT_KEY, "");
    updateStatus("New draft created.");
  }

  async function openFile(pathOverride) {
    try {
      const path =
        pathOverride ||
        (await open({
          multiple: false,
          filters: [
            {
              name: "Text",
              extensions: ["md", "markdown", "txt", "js", "json", "yml", "yaml"],
            },
          ],
        }));
      if (!path || Array.isArray(path)) return;
      const content = await readTextFile(path);
      setValue(content);
      setLastSavedValue(content);
      setFilePath(path);
      setNoteId("");
      setNoteTitle("");
      setNoteTags("");
      setMode(inferModeFromPath(path));
      window.localStorage.setItem(DRAFT_KEY, content);
      updateStatus(`Opened file: ${path}`);
    } catch (err) {
      updateStatus("", err?.message || "Failed to open file.");
    }
  }

  async function saveFile(pathOverride) {
    try {
      const path =
        pathOverride ||
        (await save({
          filters: [
            {
              name: "Text",
              extensions: ["md", "markdown", "txt", "js", "json", "yml", "yaml"],
            },
          ],
        }));
      if (!path) return;
      await writeTextFile(path, value);
      setFilePath(path);
      setLastSavedValue(value);
      updateStatus(`Saved file: ${path}`);
    } catch (err) {
      updateStatus("", err?.message || "Failed to save file.");
    }
  }

  function dbHeaders() {
    const token = dbSettings.accessToken || dbSettings.anonKey;
    return {
      apikey: dbSettings.anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
  }

  function dbBase() {
    return normalizeBaseUrl(dbSettings.supabaseUrl);
  }

  function parseTags(input) {
    if (!input) return [];
    return input
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  async function fetchNotes() {
    setNotes([]);
    setStatus("Loading notes...");
    setError("");
    try {
      const base = dbBase();
      if (!base || !dbSettings.anonKey) {
        throw new Error("Supabase URL and anon key are required.");
      }
      const params = new URLSearchParams();
      params.set("select", "id,title,updated_at");
      if (dbSettings.userId) {
        params.append("user_id", `eq.${dbSettings.userId}`);
      }
      if (noteFilter.trim()) {
        params.append("title", `ilike.*${noteFilter.trim()}*`);
      }
      params.append("order", "updated_at.desc");
      const response = await fetch(
        `${base}/rest/v1/notes?${params.toString()}`,
        { headers: dbHeaders() }
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setNotes(data || []);
      updateStatus(`Loaded ${data.length} notes.`);
    } catch (err) {
      updateStatus("", err?.message || "Failed to load notes.");
    }
  }

  async function loadNoteById(id) {
    try {
      const base = dbBase();
      if (!base || !dbSettings.anonKey) {
        throw new Error("Supabase URL and anon key are required.");
      }
      const params = new URLSearchParams();
      params.set("select", "*");
      params.append("id", `eq.${id}`);
      if (dbSettings.userId) {
        params.append("user_id", `eq.${dbSettings.userId}`);
      }
      const response = await fetch(
        `${base}/rest/v1/notes?${params.toString()}`,
        {
          headers: {
            ...dbHeaders(),
            Accept: "application/vnd.pgrst.object+json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setValue(data?.content || "");
      setLastSavedValue(data?.content || "");
      setNoteId(data?.id || "");
      setNoteTitle(data?.title || "");
      setNoteTags(Array.isArray(data?.tags) ? data.tags.join(", ") : "");
      setMode("markdown");
      setFilePath("");
      window.localStorage.setItem(DRAFT_KEY, data?.content || "");
      updateStatus(`Loaded note: ${data?.title || data?.id}`);
    } catch (err) {
      updateStatus("", err?.message || "Failed to load note.");
    }
  }

  async function saveNote() {
    try {
      const base = dbBase();
      if (!base || !dbSettings.anonKey) {
        throw new Error("Supabase URL and anon key are required.");
      }
      const now = new Date().toISOString();
      const payload = {
        title: noteTitle || "",
        content: value,
        tags: parseTags(noteTags),
        updated_at: now,
      };
      let response;
      if (noteId) {
        const params = new URLSearchParams();
        params.append("id", `eq.${noteId}`);
        if (dbSettings.userId) {
          params.append("user_id", `eq.${dbSettings.userId}`);
        }
        response = await fetch(
          `${base}/rest/v1/notes?${params.toString()}`,
          {
            method: "PATCH",
            headers: dbHeaders(),
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch(`${base}/rest/v1/notes`, {
          method: "POST",
          headers: dbHeaders(),
          body: JSON.stringify({
            user_id: dbSettings.userId || null,
            created_at: now,
            ...payload,
          }),
        });
      }
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.id) {
        setNoteId(row.id);
      }
      setLastSavedValue(value);
      updateStatus("Saved to Asuka DB.");
      await fetchNotes();
    } catch (err) {
      updateStatus("", err?.message || "Failed to save note.");
    }
  }

  function handleSave() {
    if (noteId) {
      return saveNote();
    }
    if (filePath) {
      return saveFile(filePath);
    }
    return saveFile();
  }

  function handleSettingsChange(key, next) {
    const updated = { ...dbSettings, [key]: next };
    setDbSettings(updated);
    saveSettings(updated);
  }

  function toggleDbVisible() {
    setDbVisible((prev) => {
      const next = !prev;
      window.localStorage.setItem("asuka_editor_db_visible", String(next));
      return next;
    });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="dot" />
          <div>
            <div className="title">
              Asuka Editor{isDirty ? " *" : ""}
            </div>
            <div className="subtitle">Phase 1 + 2: local + Supabase</div>
          </div>
        </div>
        <div className="controls">
          <label className="label" htmlFor="mode">
            Mode
          </label>
          <select
            id="mode"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            {Object.keys(MODE_LABELS).map((key) => (
              <option key={key} value={key}>
                {MODE_LABELS[key]}
              </option>
            ))}
          </select>
          <button
            className="ghost"
            type="button"
            onClick={() => setPreviewVisible((prev) => !prev)}
          >
            {previewVisible ? "Hide preview" : "Show preview"}
          </button>
          <button
            className="ghost"
            type="button"
            onClick={toggleDbVisible}
          >
            {dbVisible ? "Hide Asuka DB" : "Show Asuka DB"}
          </button>
          <button className="ghost" type="button" onClick={handleNew}>
            New
          </button>
          <button className="ghost" type="button" onClick={() => openFile()}>
            Open
          </button>
          <button className="primary" type="button" onClick={handleSave}>
            Save
          </button>
          <button className="ghost" type="button" onClick={() => saveFile()}>
            Save as
          </button>
          <div className="counts">
            <span>{wordCount} words</span>
            <span>{value.length} chars</span>
          </div>
        </div>
      </header>

      <main
        className={`content ${previewVisible ? "" : "no-preview"} ${
          dbVisible ? "" : "no-db"
        }`}
      >
        {dbVisible ? (
          <aside className="panel sidebar">
            <div className="panel-title">Asuka DB</div>
            <div className="sidebar-body">
              <label className="field">
                <span>Supabase URL</span>
                <input
                  type="text"
                  value={dbSettings.supabaseUrl}
                  onChange={(event) =>
                    handleSettingsChange("supabaseUrl", event.target.value)
                  }
                  placeholder="https://xyz.supabase.co"
                />
              </label>
              <label className="field">
                <span>Anon key</span>
                <input
                  type="password"
                  value={dbSettings.anonKey}
                  onChange={(event) =>
                    handleSettingsChange("anonKey", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Access token (optional)</span>
                <input
                  type="password"
                  value={dbSettings.accessToken}
                  onChange={(event) =>
                    handleSettingsChange("accessToken", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>User ID filter</span>
                <input
                  type="text"
                  value={dbSettings.userId}
                  onChange={(event) =>
                    handleSettingsChange("userId", event.target.value)
                  }
                  placeholder="auth.uid()"
                />
              </label>
              <div className="button-row">
                <button className="ghost" type="button" onClick={fetchNotes}>
                  Load notes
                </button>
                <button className="primary" type="button" onClick={saveNote}>
                  Save to DB
                </button>
              </div>
              <label className="field">
                <span>Filter by title</span>
                <input
                  type="text"
                  value={noteFilter}
                  onChange={(event) => setNoteFilter(event.target.value)}
                  onBlur={fetchNotes}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      fetchNotes();
                    }
                  }}
                  placeholder="Type and tab out"
                />
              </label>
              <div className="note-list">
                {notes.length === 0 ? (
                  <div className="note-empty">No notes loaded.</div>
                ) : (
                  notes.map((note) => (
                    <button
                      key={note.id}
                      className={`note-item ${
                        noteId === note.id ? "active" : ""
                      }`}
                      type="button"
                      onClick={() => loadNoteById(note.id)}
                    >
                      <span className="note-title">
                        {note.title || "Untitled"}
                      </span>
                      <span className="note-meta">
                        {note.updated_at
                          ? new Date(note.updated_at).toLocaleString()
                          : ""}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>
        ) : null}

        <section className="panel editor">
          <div className="panel-title">Editor</div>
          <div className="editor-meta">
            <input
              className="title-input"
              type="text"
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
              placeholder="Note title"
            />
            <input
              className="tags-input"
              type="text"
              value={noteTags}
              onChange={(event) => setNoteTags(event.target.value)}
              placeholder="Tags (comma separated)"
            />
          </div>
          <CodeMirror
            value={value}
            height="100%"
            theme="dark"
            extensions={extensions}
            onChange={handleChange}
            className="editor-surface"
          />
        </section>
        {previewVisible ? (
          <section className="panel preview">
            <div className="panel-title">Preview</div>
            <div className="preview-surface">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {previewMarkdown}
              </ReactMarkdown>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="statusbar">
        <div className="status">
          {status && <span>{status}</span>}
          {error && <span className="error">{error}</span>}
        </div>
        <div className="status-meta">
          {filePath && <span>File: {filePath}</span>}
          {noteId && <span>DB: {noteId}</span>}
        </div>
      </footer>
    </div>
  );
}
