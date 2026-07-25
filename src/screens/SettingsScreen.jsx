import React, { useState } from "react";
import { useNotesContext } from "../context/NotesContext";

export function extractDriveFolderId(value) {
  const input = String(value ?? "").trim();
  if (!input) return "";
  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/folders\/([^/?#]+)/);
    return decodeURIComponent(match?.[1] ?? url.searchParams.get("id") ?? "");
  } catch {
    return input;
  }
}

export default function SettingsScreen({ onOAuthRedirect = (url) => window.location.assign(url) }) {
  const {
    connection,
    syncState,
    syncErrorInfo,
    startDriveOAuth,
    saveDriveConnection,
    syncNow,
  } = useNotesContext();
  const [folderInput, setFolderInput] = useState(connection?.folderId ?? "");
  const [status, setStatus] = useState("");
  const [localError, setLocalError] = useState(null);

  const connect = async () => {
    setLocalError(null);
    setStatus("Opening Google authorization…");
    try {
      const result = await startDriveOAuth();
      if (!result?.authorizationUrl) throw new Error("Google authorization URL was not returned");
      setStatus("Continue in Google to finish connecting.");
      onOAuthRedirect(result.authorizationUrl);
    } catch (error) {
      setLocalError(error);
      setStatus("");
    }
  };

  const saveFolder = async () => {
    setLocalError(null);
    const folderId = extractDriveFolderId(folderInput);
    if (!folderId) {
      setLocalError(Object.assign(new Error("Enter a Google Drive folder URL or ID"), { code: "CONFIGURATION" }));
      return;
    }
    setStatus("Saving Notehub folder…");
    try {
      await saveDriveConnection(folderId);
      setFolderInput(folderId);
      setStatus("Notehub folder connected.");
    } catch (error) {
      setLocalError(error);
      setStatus("");
    }
  };

  const error = localError ?? connection?.error;

  return (
    <div className="app-page-tight space-y-5">
      <section className="app-reading-surface p-6 sm:p-8">
        <div className="app-section-title mb-2">Settings</div>
        <h1 className="text-3xl font-black tracking-tight">Drive and workspace</h1>
        <p className="mt-2 app-muted-text">Supabase remains your sign-in provider. Notehub files are stored in your selected Google Drive folder.</p>

        <section aria-labelledby="drive-heading" className="mt-6 rounded-2xl border app-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="drive-heading" className="text-xl font-bold">Google Drive</h2>
              <div className="mt-1 text-sm app-muted-text">
                {connection?.connected
                  ? <>Connected folder: <span className="font-semibold text-[var(--app-text)]">{connection.folderId || "Choose a folder"}</span></>
                  : "Google Drive is not connected yet."}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={connect} className="app-primary-button">
                {connection?.connected ? "Reconnect Google Drive" : "Connect Google Drive"}
              </button>
              <button type="button" onClick={() => syncNow()} className="app-secondary-button">Sync now</button>
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="drive-folder" className="text-sm font-semibold">Notehub folder URL or ID</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="drive-folder"
                aria-label="Notehub folder URL or ID"
                value={folderInput}
                onChange={(event) => setFolderInput(event.target.value)}
                placeholder="https://drive.google.com/drive/folders/…"
                className="min-w-0 flex-1 rounded-xl border app-input px-4 py-3"
              />
              <button type="button" onClick={saveFolder} className="app-primary-button">Save Notehub folder</button>
            </div>
            <p className="mt-2 text-xs app-muted-text">Only the folder ID is saved through the connection endpoint. Google access and refresh tokens are never shown here.</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="app-chip rounded-full px-3 py-1">Sync: {syncState}</span>
            {status && <span aria-live="polite" className="text-blue-700">{status}</span>}
          </div>

          {syncErrorInfo && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              <div className="font-semibold">{syncErrorInfo.title}</div>
              <div className="mt-1">{syncErrorInfo.action}</div>
            </div>
          )}
          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              {error.message || "Drive settings could not be updated."}
            </div>
          )}
        </section>
      </section>

      <section className="app-reading-surface p-6 sm:p-8">
        <div className="app-section-title mb-3">Guide</div>
        <h2 className="text-2xl font-bold">Workspace basics</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li><strong>All Notes, Tags, and Focus</strong> browse your cached Notehub Drive notes.</li>
          <li><strong>Folders</strong> scope the list recursively, including nested folders.</li>
          <li><strong>Legacy</strong> keeps existing Supabase notes read-only; copy one to Notehub when you want to edit it.</li>
          <li><strong>Pending</strong> changes are safe in the local IndexedDB cache and sync when connectivity returns.</li>
          <li><strong>Google Docs</strong> can be read here and edited with the Open in Google Docs action.</li>
        </ul>

        <h3 className="mt-6 text-lg font-semibold">Keyboard shortcuts</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li><kbd>Ctrl/Cmd</kbd> + <kbd>K</kbd>: open command palette</li>
          <li><kbd>Ctrl/Cmd</kbd> + <kbd>9</kbd>: create a new note</li>
          <li><kbd>Ctrl/Cmd</kbd> + <kbd>0</kbd>: return to the note list</li>
          <li><kbd>Ctrl/Cmd</kbd> + <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>: switch editor view modes</li>
        </ul>
      </section>
    </div>
  );
}
