import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import SettingsScreen from "../../src/screens/SettingsScreen.jsx";
import { NotesContext } from "../../src/context/NotesContext.jsx";

vi.mock("../../src/drive/service.js", () => ({ notehubDriveService: null }));
vi.mock("../../src/services/legacyNotesService.js", () => ({ legacyNotesService: null }));
vi.mock("../../src/services/authService.js", () => ({ subscribeToAuth: () => () => {} }));

function renderSettings(overrides = {}) {
  const value = {
    connection: { connected: false, folderId: null, loading: false, error: null },
    syncState: "offline",
    syncErrorInfo: null,
    startDriveOAuth: vi.fn(async () => ({ authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth" })),
    saveDriveConnection: vi.fn(async (folderId) => ({ connected: true, folderId })),
    syncNow: vi.fn(async () => {}),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <NotesContext.Provider value={value}>
        <SettingsScreen onOAuthRedirect={vi.fn()} />
      </NotesContext.Provider>
    </MemoryRouter>,
  );
  return value;
}

describe("Drive settings", () => {
  test("starts OAuth and saves a folder URL through the connection action", async () => {
    const value = renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Connect Google Drive" }));
    await waitFor(() => expect(value.startDriveOAuth).toHaveBeenCalled());

    fireEvent.change(screen.getByRole("textbox", { name: "Notehub folder URL or ID" }), {
      target: { value: "https://drive.google.com/drive/folders/folder-ABC_123?usp=sharing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Notehub folder" }));

    await waitFor(() => expect(value.saveDriveConnection).toHaveBeenCalledWith("folder-ABC_123"));
  });

  test("shows connected folder, manual sync, reconnect, and safe errors without tokens", () => {
    const value = renderSettings({
      connection: {
        connected: true,
        folderId: "connected-folder",
        loading: false,
        error: Object.assign(new Error("Folder is outside Notehub"), { code: "BOUNDARY" }),
        accessToken: "must-not-render",
        refreshToken: "must-not-render-either",
      },
      syncState: "error",
      syncErrorInfo: { code: "RATE_LIMIT", title: "Google Drive is rate-limiting sync", action: "Retry sync" },
    });

    expect(screen.getByText("connected-folder")).toBeInTheDocument();
    expect(screen.getByText("Google Drive is rate-limiting sync")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sync now" }));
    expect(value.syncNow).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Reconnect Google Drive" })).toBeInTheDocument();
    expect(screen.queryByText("must-not-render")).not.toBeInTheDocument();
    expect(screen.queryByText("must-not-render-either")).not.toBeInTheDocument();
  });
});
