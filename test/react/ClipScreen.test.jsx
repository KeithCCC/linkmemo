import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import ClipScreen from "../../src/screens/ClipScreen.jsx";
import { AuthProvider } from "../../src/context/AuthContext.jsx";
import { NotesContext } from "../../src/context/NotesContext.jsx";

vi.mock("../../src/drive/service.js", () => ({ notehubDriveService: null }));
vi.mock("../../src/services/legacyNotesService.js", () => ({ legacyNotesService: null }));
vi.mock("../../src/services/authService.js", () => ({
  subscribeToAuth(callback) {
    callback({ uid: "user" });
    return () => {};
  },
}));
vi.mock("../../src/services/notesService.js", () => ({ createNote: async () => "legacy-write-path" }));

describe("web clipper Notehub integration", () => {
  test("creates a local-first Drive note instead of mutating Supabase", async () => {
    const createDriveNote = vi.fn(async () => "drive-note");
    window.history.pushState({}, "", "/clip?url=https%3A%2F%2Fexample.com&title=Example");
    render(
      <MemoryRouter initialEntries={["/clip?url=https%3A%2F%2Fexample.com&title=Example"]}>
        <AuthProvider>
          <NotesContext.Provider value={{ createDriveNote }}>
            <Routes>
              <Route path="/clip" element={<ClipScreen />} />
              <Route path="/edit/:id" element={<div>Drive editor</div>} />
            </Routes>
          </NotesContext.Provider>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(createDriveNote).toHaveBeenCalledWith(expect.objectContaining({
      title: "Example",
      content: expect.stringContaining("https://example.com"),
    })));
    expect(await screen.findByText("Drive editor")).toBeInTheDocument();
  });
});
