import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import NoteEditScreen from "../../src/screens/NoteEditScreen.jsx";
import { NotesContext } from "../../src/context/NotesContext.jsx";
import { AuthProvider } from "../../src/context/AuthContext.jsx";

vi.mock("../../src/drive/service.js", () => ({ notehubDriveService: null }));
vi.mock("../../src/services/legacyNotesService.js", () => ({ legacyNotesService: null }));
vi.mock("../../src/services/authService.js", () => ({
  subscribeToAuth(callback) {
    callback({ uid: "user" });
    return () => {};
  },
}));
vi.mock("../../src/services/notesService.js", () => ({
  getNoteById: async () => null,
  createNote: async () => null,
  updateNote: async () => null,
}));

function renderEditor(note, overrides = {}) {
  const notes = overrides.notes ?? [note];
  const value = {
    notes,
    driveNotes: notes.filter((item) => item.source !== "legacy"),
    legacyNotes: notes.filter((item) => item.source === "legacy"),
    folders: [
      { id: "projects", name: "Projects", parentId: null },
      { id: "sprint", name: "Sprint", parentId: "projects" },
      { id: "archive", name: "Archive", parentId: null },
    ],
    syncState: "synced",
    getNoteById: (id) => notes.find((item) => item.id === id),
    createDriveNote: vi.fn(async () => "created"),
    updateDriveNote: vi.fn(async () => {}),
    moveDriveNote: vi.fn(async () => {}),
    trashDriveNote: vi.fn(async () => {}),
    copyLegacyToNotehub: vi.fn(async () => "copied"),
    ...overrides,
  };
  render(
    <MemoryRouter initialEntries={[`/edit/${note.id}`]}>
      <AuthProvider>
        <NotesContext.Provider value={value}>
          <Routes>
            <Route path="/edit/:id" element={<NoteEditScreen user={{ uid: "user" }} />} />
            <Route path="/" element={<div>Notes list</div>} />
          </Routes>
        </NotesContext.Provider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return value;
}

describe("hybrid note editor", () => {
  beforeEach(() => localStorage.clear());

  test("edits raw Markdown locally and exposes folder, save, move, and trash controls", async () => {
    const note = { id: "md", title: "Plan", content: "Original", tags: [], focus: false, source: "drive-markdown", editable: true, parentId: "sprint" };
    const value = renderEditor(note);

    expect(screen.getByText("Notehub / Projects / Sprint", { selector: "span" })).toBeInTheDocument();
    const editor = screen.getByRole("textbox", { name: "Markdown content" });
    fireEvent.change(editor, { target: { value: "Changed" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(value.updateDriveNote).toHaveBeenCalledWith("md", expect.objectContaining({ content: "Changed" }));

    fireEvent.change(screen.getByRole("combobox", { name: "Move note to folder" }), { target: { value: "archive" } });
    expect(value.moveDriveNote).toHaveBeenCalledWith("md", "archive");

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Trash note" }));
    expect(value.trashDriveNote).toHaveBeenCalledWith("md");
    confirm.mockRestore();
  });

  test("shows Google Docs read-only with an external edit action", () => {
    renderEditor({ id: "doc-1", title: "Google plan", content: "# Exported", source: "drive-doc", editable: false, parentId: "projects" });

    expect(screen.queryByRole("textbox", { name: "Markdown content" })).not.toBeInTheDocument();
    expect(screen.getByText("Read-only Google Doc")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in Google Docs" })).toHaveAttribute("href", "https://docs.google.com/document/d/doc-1/edit");
  });

  test("shows Legacy read-only and copies it without exposing edit or trash", async () => {
    const value = renderEditor({ id: "legacy-1", title: "Old note", content: "Archive", source: "legacy", editable: false });

    expect(screen.queryByRole("textbox", { name: "Markdown content" })).not.toBeInTheDocument();
    expect(screen.getByText("Read-only Legacy note")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy to Notehub" }));
    expect(value.copyLegacyToNotehub).toHaveBeenCalledWith("legacy-1");
    expect(screen.queryByRole("button", { name: "Trash note" })).not.toBeInTheDocument();
  });

  test("prefers same-folder wiki matches and asks when remaining matches are ambiguous", () => {
    const current = { id: "current", title: "Current", content: "See [[Shared]] and [[Ambiguous]]", source: "drive-markdown", editable: true, parentId: "sprint" };
    renderEditor(current, {
      notes: [
        current,
        { id: "same", title: "Shared", content: "", source: "drive-markdown", editable: true, parentId: "sprint" },
        { id: "other-shared", title: "Shared", content: "", source: "drive-markdown", editable: true, parentId: "archive" },
        { id: "a1", title: "Ambiguous", content: "", source: "drive-markdown", editable: true, parentId: "projects" },
        { id: "a2", title: "Ambiguous", content: "", source: "drive-markdown", editable: true, parentId: "archive" },
      ],
    });

    const wiki = screen.getByRole("region", { name: "Wiki links" });
    expect(within(wiki).getByRole("link", { name: "Shared" })).toHaveAttribute("href", "/edit/same");
    expect(within(wiki).getByRole("combobox", { name: "Choose note for [[Ambiguous]]" })).toBeInTheDocument();
  });
});
