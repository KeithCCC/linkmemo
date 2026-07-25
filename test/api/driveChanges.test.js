import { describe, expect, test } from "vitest";
import { DriveService } from "../../server/drive/service.js";

function changeDrive({ failOn } = {}) {
  const files = {
    root: { id: "root", mimeType: "application/vnd.google-apps.folder", parents: [] },
    allowed: { id: "allowed", mimeType: "text/markdown", parents: ["root"] },
    outside: { id: "outside", mimeType: "text/markdown", parents: ["elsewhere"] },
  };
  return {
    async getFile(id) { return files[id] ?? null; },
    async listChanges(token) {
      if (token === "first") return { changes: [{ fileId: "allowed", file: files.allowed }, { fileId: "outside", file: files.outside }, { fileId: "gone", removed: true }], nextPageToken: "second" };
      if (failOn === "second") throw new Error("Google unavailable");
      return { changes: [{ fileId: "gone2", removed: true }], newStartPageToken: "saved-token" };
    },
  };
}

describe("Drive change filtering", () => {
  test("returns only accessible changed files and client-known removals after all pages succeed", async () => {
    const persisted = [];
    const service = new DriveService({ drive: changeDrive(), rootId: "root" });

    await expect(service.changes({ pageToken: "first", knownIds: ["gone"], persistPageToken: async (value) => persisted.push(value) })).resolves.toEqual({
      changes: [{ fileId: "allowed", file: { id: "allowed", mimeType: "text/markdown", parents: ["root"] } }, { fileId: "gone", removed: true }],
      pageToken: "saved-token",
    });
    expect(persisted).toEqual(["saved-token"]);
  });

  test("does not persist a page token when traversal fails", async () => {
    const persisted = [];
    const service = new DriveService({ drive: changeDrive({ failOn: "second" }), rootId: "root" });

    await expect(service.changes({ pageToken: "first", knownIds: ["gone"], persistPageToken: async (value) => persisted.push(value) })).rejects.toThrow("Google unavailable");
    expect(persisted).toEqual([]);
  });

  test("starts from Google's initial page token when the connection has not synced before", async () => {
    const drive = changeDrive();
    const receivedTokens = [];
    const listChanges = drive.listChanges;
    drive.listChanges = async (token) => {
      receivedTokens.push(token);
      return listChanges(token);
    };
    drive.getStartPageToken = async () => "first";
    const persisted = [];
    const service = new DriveService({ drive, rootId: "root" });

    await expect(service.changes({ knownIds: ["gone"], persistPageToken: async (value) => persisted.push(value) })).resolves.toMatchObject({ pageToken: "saved-token" });
    expect(receivedTokens[0]).toBe("first");
    expect(persisted).toEqual(["saved-token"]);
  });
});
