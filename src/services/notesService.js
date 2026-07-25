import { uxLegacyNotesService } from "./dummyNotesService";

// Compatibility reads are local-only until the Drive service is configured.
export const getNotes = (uid) => uxLegacyNotesService.list(uid);
export const getNoteById = (uid, noteId) => uxLegacyNotesService.get(uid, noteId);
