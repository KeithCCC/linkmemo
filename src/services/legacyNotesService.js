import { supabase } from "../supabase";

function normalize(note) {
  if (!note) return null;
  return {
    id: note.id,
    title: note.title ?? "",
    content: note.content ?? "",
    tags: Array.isArray(note.tags) ? note.tags : [],
    focus: Boolean(note.focus),
    createdAt: note.created_at ?? note.createdAt,
    updatedAt: note.updated_at ?? note.updatedAt,
    source: "legacy",
    editable: false,
  };
}

export const legacyNotesService = {
  async list(uid) {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, tags, focus, created_at, updated_at")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(normalize);
  },

  async get(uid, noteId) {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, tags, focus, created_at, updated_at")
      .eq("id", noteId)
      .eq("user_id", uid)
      .single();
    if (error?.code === "PGRST116") return null;
    if (error) throw error;
    return normalize(data);
  },
};
