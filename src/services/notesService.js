import { isUxTestMode } from "../appMode";
import { legacyNotesService } from "./legacyNotesService";
import { uxLegacyNotesService } from "./dummyNotesService";

const service = isUxTestMode ? uxLegacyNotesService : legacyNotesService;

// Compatibility reads only. All note mutations go through NotehubDriveService.
export const getNotes = (uid) => service.list(uid);
export const getNoteById = (uid, noteId) => service.get(uid, noteId);
