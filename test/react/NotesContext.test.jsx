import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthProvider } from "../../src/context/AuthContext.jsx";
import { classifySyncError, NotesProvider, useNotesContext } from "../../src/context/NotesContext.jsx";

vi.mock("../../src/services/authService.js", () => ({
  subscribeToAuth(callback) {
    callback({ uid: "user-1", email: "user@example.com" });
    return () => {};
  },
}));

vi.mock("../../src/services/notesService.js", () => ({
  getNotes: async () => [],
  deleteNote: async () => {},
}));

vi.mock("../../src/drive/service.js", () => ({ notehubDriveService: null }));
vi.mock("../../src/services/legacyNotesService.js", () => ({ legacyNotesService: null }));

function createDriveService({ syncError } = {}) {
  let snapshot = {
    state: "offline",
    error: null,
    notes: [{ id: "cached", title: "Cached Drive", content: "Available offline", source: "drive-markdown", editable: true, parentId: "folder" }],
    folders: [{ id: "folder", name: "Projects", parentId: null }],
  };
  const listeners = new Set();
  const publish = () => listeners.forEach((listener) => listener(snapshot));
  return {
    syncCalls: 0,
    created: [],
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => snapshot,
    async hydrate() {
      publish();
      return snapshot;
    },
    async sync() {
      this.syncCalls += 1;
      snapshot = { ...snapshot, state: "syncing", error: null };
      publish();
      if (syncError) {
        snapshot = { ...snapshot, state: "error", error: syncError };
        publish();
        throw syncError;
      }
      snapshot = { ...snapshot, state: "synced", error: null };
      publish();
      return snapshot;
    },
    async flushOutbox() {
      return this.sync();
    },
    async createNote(input) {
      this.created.push(input);
      const id = "copied-drive-note";
      snapshot = {
        ...snapshot,
        state: "pending",
        notes: [...snapshot.notes, { id, ...input, source: "drive-markdown", editable: true }],
      };
      publish();
      return id;
    },
  };
}

function ContextProbe() {
  const {
    driveNotes,
    legacyNotes,
    syncState,
    syncError,
    currentWorkspace,
    selectWorkspace,
    copyLegacyToNotehub,
  } = useNotesContext();
  return (
    <div>
      <div data-testid="drive-titles">{driveNotes?.map((note) => note.title).join(",")}</div>
      <div data-testid="legacy-titles">{legacyNotes?.map((note) => note.title).join(",")}</div>
      <div data-testid="sync-state">{syncState}</div>
      <div data-testid="sync-error">{syncError?.code}</div>
      <div data-testid="workspace">{currentWorkspace?.type}</div>
      <button onClick={() => selectWorkspace({ type: "folder", folderId: "folder" })}>Select folder</button>
      <button onClick={() => copyLegacyToNotehub("legacy-1")}>Copy legacy</button>
    </div>
  );
}

describe("NotesProvider Drive and Legacy integration", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  });

  test("hydrates cached Drive notes before a failed remote sync and never blanks them", async () => {
    const driveService = createDriveService({ syncError: Object.assign(new Error("Drive unavailable"), { code: "UPSTREAM" }) });
    const legacyService = {
      list: async () => [{ id: "legacy-1", title: "Legacy Archive", content: "Old", source: "legacy", editable: false }],
      get: async () => null,
    };

    render(
      <AuthProvider>
        <NotesProvider driveService={driveService} legacyService={legacyService} connectionClient={{ connection: async () => ({ connected: true, folderId: "root" }) }}>
          <ContextProbe />
        </NotesProvider>
      </AuthProvider>,
    );

    expect(await screen.findByText("Cached Drive")).toBeInTheDocument();
    expect(await screen.findByText("Legacy Archive")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("sync-state")).toHaveTextContent("error"));
    expect(screen.getByTestId("sync-error")).toHaveTextContent("UPSTREAM");
    expect(screen.getByTestId("drive-titles")).toHaveTextContent("Cached Drive");
  });

  test("copies Legacy content into the selected Notehub folder without mutating Legacy", async () => {
    const driveService = createDriveService();
    const legacy = { id: "legacy-1", title: "Legacy Archive", content: "Old", tags: ["archive"], focus: true, source: "legacy", editable: false };
    const legacyService = {
      list: async () => [legacy],
      get: async (_uid, id) => id === legacy.id ? legacy : null,
    };

    render(
      <AuthProvider>
        <NotesProvider driveService={driveService} legacyService={legacyService} connectionClient={{ connection: async () => ({ connected: false, folderId: null }) }}>
          <ContextProbe />
        </NotesProvider>
      </AuthProvider>,
    );

    await screen.findByText("Legacy Archive");
    fireEvent.click(screen.getByRole("button", { name: "Select folder" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy legacy" }));

    await waitFor(() => expect(driveService.created).toEqual([
      expect.objectContaining({ title: "Legacy Archive", content: "Old", parentId: "folder" }),
    ]));
    expect(legacy).toEqual(expect.objectContaining({ id: "legacy-1", source: "legacy", content: "Old" }));
    expect(screen.getByTestId("workspace")).toHaveTextContent("folder");
  });

  test("flushes pending work when the browser comes back online", async () => {
    const driveService = createDriveService();
    render(
      <AuthProvider>
        <NotesProvider driveService={driveService} legacyService={{ list: async () => [] }} connectionClient={{ connection: async () => ({ connected: true, folderId: "root" }) }}>
          <ContextProbe />
        </NotesProvider>
      </AuthProvider>,
    );
    await screen.findByText("Cached Drive");
    await waitFor(() => expect(driveService.syncCalls).toBe(1));

    window.dispatchEvent(new Event("online"));

    await waitFor(() => expect(driveService.syncCalls).toBe(2));
  });

  test.each([
    ["AUTH", true, "Sign-in expired"],
    ["CONFIGURATION", true, "Choose a Notehub folder"],
    ["NOT_FOUND", true, "Choose a Notehub folder"],
    ["BOUNDARY", true, "Item is outside Notehub"],
    ["RATE_LIMIT", true, "Google Drive is rate-limiting sync"],
    ["UPSTREAM", true, "Google Drive is unavailable"],
    ["UNKNOWN", true, "Sync needs attention"],
    ["UPSTREAM", false, "You are offline"],
  ])("classifies %s errors with online=%s", (code, online, title) => {
    expect(classifySyncError({ code }, online)).toEqual(expect.objectContaining({ title, action: expect.any(String) }));
  });
});
