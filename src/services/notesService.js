import { isUxTestMode } from "../appMode";
import * as liveNotesService from "../supabaseNotesService";
import * as dummyNotesService from "./dummyNotesService";

const notesService = isUxTestMode ? dummyNotesService : liveNotesService;

export const getNotes = notesService.getNotes;
export const createNote = notesService.createNote;
export const updateNote = notesService.updateNote;
export const deleteNote = notesService.deleteNote;
export const getNoteById = notesService.getNoteById;

