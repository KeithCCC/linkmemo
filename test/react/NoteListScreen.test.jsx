import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import NoteListScreen from "../../src/screens/NoteListScreen.jsx";
import { NotesContext } from "../../src/context/NotesContext.jsx";

vi.mock("../../src/drive/service.js", () => ({ notehubDriveService: null }));
vi.mock("../../src/services/legacyNotesService.js", () => ({ legacyNotesService: null }));
vi.mock("../../src/services/authService.js", () => ({ subscribeToAuth: () => () => {} }));
vi.mock("../../src/services/notesService.js", () => ({ updateNote: async () => {} }));

function renderList(overrides = {}) {
  const driveNotes = [
    { id: "child", title: "Sprint plan", content: "#work", tags: ["work"], focus: true, source: "drive-markdown", editable: true, parentId: "sprint", updatedAt: "2026-07-25T00:00:00.000Z" },
    { id: "other", title: "Personal note", content: "private", tags: [], focus: false, source: "drive-markdown", editable: true, parentId: "personal", updatedAt: "2026-07-24T00:00:00.000Z" },
  ];
  const value = {
    notes: driveNotes,
    driveNotes,
    legacyNotes: [],
    visibleNotes: [driveNotes[0]],
    folders: [
      { id: "projects", name: "Projects", parentId: null },
      { id: "sprint", name: "Sprint", parentId: "projects" },
      { id: "personal", name: "Personal", parentId: null },
    ],
    currentWorkspace: { type: "folder", folderId: "projects" },
    currentFolder: { id: "projects", name: "Projects", parentId: null },
    syncState: "pending",
    updateDriveNote: vi.fn(),
    trashDriveNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <NotesContext.Provider value={value}>
        <NoteListScreen />
      </NotesContext.Provider>
    </MemoryRouter>,
  );
  return value;
}

describe("Note list workspace behavior", () => {
  test("uses recursively folder-scoped notes and shows path, source, and sync status", () => {
    renderList();

    expect(screen.getByRole("link", { name: "Sprint plan" })).toBeInTheDocument();
    expect(screen.queryByText("Personal note")).not.toBeInTheDocument();
    const card = screen.getByRole("article", { name: "Sprint plan" });
    expect(within(card).getByText("Notehub / Projects / Sprint")).toBeInTheDocument();
    expect(within(card).getByText("Markdown")).toBeInTheDocument();
    expect(within(card).getByText("Pending")).toBeInTheDocument();
  });

  test("renders Legacy notes as a separate read-only source without mutation actions", () => {
    const legacy = { id: "legacy-1", title: "Archived note", content: "Old", tags: ["archive"], focus: false, source: "legacy", editable: false, updatedAt: "2025-01-01T00:00:00.000Z" };
    renderList({
      notes: [legacy],
      driveNotes: [],
      legacyNotes: [legacy],
      visibleNotes: [legacy],
      currentWorkspace: { type: "legacy", folderId: null },
      currentFolder: null,
      syncState: "synced",
    });

    const card = screen.getByRole("article", { name: "Archived note" });
    expect(within(card).getByText("Legacy")).toBeInTheDocument();
    expect(within(card).getByText("Read-only")).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /delete|trash/i })).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /focus/i })).not.toBeInTheDocument();
  });
});
