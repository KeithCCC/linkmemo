import { uxTestNotes } from "../fixtures/uxTestNotes";

const storageKey = (uid) => `uxTest.notes.${uid || "default"}`;

const clone = (value) => JSON.parse(JSON.stringify(value));

const readNotes = (uid) => {
  const key = storageKey(uid);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = clone(uxTestNotes);
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : clone(uxTestNotes);
  } catch {
    return clone(uxTestNotes);
  }
};

const writeNotes = (uid, notes) => {
  localStorage.setItem(storageKey(uid), JSON.stringify(notes));
};

const sortByUpdatedDesc = (notes) =>
  [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

export const getNotes = async (uid) => {
  return sortByUpdatedDesc(readNotes(uid));
};

export const createNote = async (uid, note) => {
  const notes = readNotes(uid);
  const now = new Date().toISOString();
  const created = {
    ...note,
    id: note.id || `ux-${Date.now()}`,
    title: note.title || "",
    content: note.content || "",
    tags: Array.isArray(note.tags) ? note.tags : [],
    focus: Boolean(note.focus),
    createdAt: note.createdAt || now,
    updatedAt: now,
  };
  notes.push(created);
  writeNotes(uid, sortByUpdatedDesc(notes));
  return created.id;
};

export const updateNote = async (uid, noteId, note) => {
  const notes = readNotes(uid).map((item) =>
    item.id === noteId
      ? {
          ...item,
          ...note,
          updatedAt: note.updatedAt || new Date().toISOString(),
        }
      : item
  );
  writeNotes(uid, sortByUpdatedDesc(notes));
  return noteId;
};

export const deleteNote = async (uid, noteId) => {
  const notes = readNotes(uid).filter((item) => item.id !== noteId);
  writeNotes(uid, notes);
};

export const getNoteById = async (uid, noteId) => {
  const notes = readNotes(uid);
  return notes.find((item) => item.id === noteId) || null;
};

const UX_FOLDERS = [
  { id: "ux-folder-projects", name: "Projects", parentId: null },
  { id: "ux-folder-sprint", name: "Current sprint", parentId: "ux-folder-projects" },
  { id: "ux-folder-reference", name: "Reference", parentId: null },
];

const UX_DRIVE_NOTES = [
  ...uxTestNotes.map((note, index) => ({
    ...clone(note),
    source: "drive-markdown",
    editable: true,
    parentId: index % 3 === 0 ? "ux-folder-sprint" : index % 3 === 1 ? "ux-folder-projects" : "ux-folder-reference",
  })),
  {
    id: "ux-google-doc",
    title: "UX Google Doc sample",
    content: "# Exported Google Doc\n\nThis fixture is read-only.",
    tags: [],
    focus: false,
    source: "drive-doc",
    editable: false,
    parentId: "ux-folder-reference",
    createdAt: "2026-04-20T08:00:00.000Z",
    updatedAt: "2026-04-23T09:00:00.000Z",
  },
];

const UX_LEGACY_NOTES = [
  {
    id: "ux-legacy-1",
    title: "Legacy launch notes",
    content: "# Legacy launch notes\n\nA deterministic read-only Supabase fixture.",
    tags: ["legacy"],
    focus: false,
    source: "legacy",
    editable: false,
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2025-12-02T00:00:00.000Z",
  },
];

export const uxLegacyNotesService = {
  async list() {
    return clone(UX_LEGACY_NOTES);
  },
  async get(_uid, id) {
    return clone(UX_LEGACY_NOTES.find((note) => note.id === id) ?? null);
  },
};

export function createUxDriveService() {
  let notes = clone(UX_DRIVE_NOTES);
  let folders = clone(UX_FOLDERS);
  let state = "synced";
  let error = null;
  let sequence = 0;
  let folderId = "ux-notehub-root";
  const listeners = new Set();
  const snapshot = () => ({ state, error, notes: clone(notes), folders: clone(folders) });
  const publish = () => {
    const value = snapshot();
    listeners.forEach((listener) => listener(value));
    return value;
  };
  const pending = () => {
    state = "pending";
    error = null;
    publish();
  };

  const service = {
    client: {
      async connection() {
        return { connected: true, folderId, grantedScope: "drive" };
      },
      async oauthStart() {
        return { authorizationUrl: "/settings?ux_oauth=complete" };
      },
      async updateConnection(nextFolderId) {
        folderId = nextFolderId;
        return { connected: true, folderId, grantedScope: "drive" };
      },
    },
    snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async hydrate() {
      return publish();
    },
    async sync() {
      state = "syncing";
      publish();
      state = "synced";
      error = null;
      return publish();
    },
    async flushOutbox() {
      state = "synced";
      error = null;
      return publish();
    },
    async createNote({ title = "Untitled", content = "", parentId = null } = {}) {
      sequence += 1;
      const id = `local:ux-created-${sequence}`;
      notes.push({
        id,
        title,
        content,
        tags: [],
        focus: false,
        source: "drive-markdown",
        editable: true,
        parentId,
        createdAt: "2026-04-24T12:00:00.000Z",
        updatedAt: "2026-04-24T12:00:00.000Z",
      });
      pending();
      return id;
    },
    async updateNote(id, patch) {
      notes = notes.map((note) => note.id === id && note.editable !== false ? { ...note, ...patch, updatedAt: "2026-04-24T12:00:00.000Z" } : note);
      pending();
    },
    async moveNote(id, parentId) {
      notes = notes.map((note) => note.id === id && note.editable !== false ? { ...note, parentId } : note);
      pending();
    },
    async trashNote(id) {
      notes = notes.filter((note) => note.id !== id);
      pending();
    },
    async createFolder({ name, parentId = null }) {
      sequence += 1;
      const id = `local:ux-folder-${sequence}`;
      folders.push({ id, name, parentId });
      pending();
      return id;
    },
    async renameFolder(id, name) {
      folders = folders.map((folder) => folder.id === id ? { ...folder, name } : folder);
      pending();
    },
    async moveFolder(id, parentId) {
      folders = folders.map((folder) => folder.id === id ? { ...folder, parentId } : folder);
      pending();
    },
    async trashFolder(id) {
      const removed = new Set([id]);
      let added = true;
      while (added) {
        added = false;
        folders.forEach((folder) => {
          if (removed.has(folder.parentId) && !removed.has(folder.id)) {
            removed.add(folder.id);
            added = true;
          }
        });
      }
      folders = folders.filter((folder) => !removed.has(folder.id));
      notes = notes.filter((note) => !removed.has(note.parentId));
      pending();
    },
  };
  return service;
}

