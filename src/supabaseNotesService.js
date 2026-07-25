import { legacyNotesService } from "./services/legacyNotesService";

// Compatibility reads for older imports. Supabase notes are Legacy and read-only.
export const getNotes = (uid) => legacyNotesService.list(uid);
export const getNoteById = (uid, noteId) => legacyNotesService.get(uid, noteId);
