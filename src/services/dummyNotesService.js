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

