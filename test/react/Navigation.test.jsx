import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import Navigation from "../../src/components/Navigation.jsx";
import { NotesContext } from "../../src/context/NotesContext.jsx";

vi.mock("../../src/drive/service.js", () => ({ notehubDriveService: null }));
vi.mock("../../src/services/legacyNotesService.js", () => ({ legacyNotesService: null }));
vi.mock("../../src/services/authService.js", () => ({ subscribeToAuth: () => () => {} }));

function renderNavigation(overrides = {}, props = {}) {
  const value = {
    notes: [],
    driveNotes: [],
    legacyNotes: [],
    folders: [
      { id: "projects", name: "Projects", parentId: null },
      { id: "sprint", name: "Sprint", parentId: "projects" },
      { id: "archive", name: "Archive", parentId: null },
    ],
    currentWorkspace: { type: "all", folderId: null },
    syncState: "pending",
    syncError: null,
    connection: { connected: true, folderId: "root" },
    selectWorkspace: vi.fn(),
    createDriveFolder: vi.fn(),
    renameDriveFolder: vi.fn(),
    moveDriveFolder: vi.fn(),
    trashDriveFolder: vi.fn(),
    syncNow: vi.fn(),
    addNote: vi.fn(),
    ...overrides,
  };
  const setCollapsed = vi.fn();
  render(
    <MemoryRouter>
      <NotesContext.Provider value={value}>
        <Navigation
          collapsed={false}
          setCollapsed={setCollapsed}
          isMobileNav
          user={{ uid: "user", email: "user@example.com" }}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          {...props}
        />
      </NotesContext.Provider>
    </MemoryRouter>,
  );
  return { value, setCollapsed };
}

describe("hybrid workspace navigation", () => {
  test("shows workspace entries, recursive folders, and pending sync state", () => {
    renderNavigation();

    const navigation = screen.getByRole("navigation", { name: "Workspaces" });
    expect(within(navigation).getByRole("button", { name: "All Notes" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Tags" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Focus" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Legacy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Projects folder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sprint folder" })).toBeInTheDocument();
    expect(screen.getByText("Pending changes")).toBeInTheDocument();
  });

  test("selects a nested folder and closes the full-width mobile drawer", () => {
    const { value, setCollapsed } = renderNavigation();

    fireEvent.click(screen.getByRole("button", { name: "Sprint folder" }));

    expect(value.selectWorkspace).toHaveBeenCalledWith({ type: "folder", folderId: "sprint" });
    expect(setCollapsed).toHaveBeenCalledWith(true);
    expect(screen.getByRole("complementary")).toHaveClass("w-full");
  });

  test("confirms before trashing the selected folder", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { value } = renderNavigation({ currentWorkspace: { type: "folder", folderId: "projects" } });

    fireEvent.click(screen.getByRole("button", { name: "Trash Projects" }));

    expect(confirm).toHaveBeenCalled();
    expect(value.trashDriveFolder).toHaveBeenCalledWith("projects");
    confirm.mockRestore();
  });
});
