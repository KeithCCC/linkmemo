const RECENTS_KEY = 'recentNotes';
const MAX_RECENTS = 10;

export function getRecentNotes() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function addRecentNote(note) {
  if (!note || !note.id) return getRecentNotes();
  const title = (note.title || 'Untitled').toString();
  const id = note.id.toString();
  const now = Date.now();
  try {
    const list = getRecentNotes().filter((n) => n.id.toString() !== id);
    const next = [{ id, title, at: now }, ...list].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    // Notify any listeners (e.g., Navigation) to refresh
    try {
      window.dispatchEvent(new CustomEvent('recent-notes-updated'));
    } catch {}
    return next;
  } catch {
    return getRecentNotes();
  }
}

export function clearRecentNotes() {
  localStorage.removeItem(RECENTS_KEY);
  try { window.dispatchEvent(new CustomEvent('recent-notes-updated')); } catch {}
}

export const RECENT_NOTES_EVENT = 'recent-notes-updated';
