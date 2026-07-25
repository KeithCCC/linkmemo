import { describe, expect, test } from "vitest";
import { DriveService } from "../../api/drive/service.js";

function fakeDrive() {
  const files = {
    root: { id: "root", name: "Notehub", mimeType: "application/vnd.google-apps.folder", parents: [] },
    folder: { id: "folder", name: "Projects", mimeType: "application/vnd.google-apps.folder", parents: ["root"] },
    md: { id: "md", name: "a.md", mimeType: "text/markdown", parents: ["folder"] },
    txt: { id: "txt", name: "b.txt", mimeType: "text/plain", parents: ["root"] },
    doc: { id: "doc", name: "Google note", mimeType: "application/vnd.google-apps.document", parents: ["root"] },
    pdf: { id: "pdf", name: "skip.pdf", mimeType: "application/pdf", parents: ["root"] },
    outsider: { id: "outsider", name: "other.md", mimeType: "text/markdown", parents: ["elsewhere"] },
  };
  const calls = [];
  return {
    files,
    calls,
    async getFile(id) { return files[id] ?? null; },
    async listChildren(parentId) { return Object.values(files).filter((file) => file.parents.includes(parentId)); },
    async downloadFile(id) { calls.push(["download", id]); return `raw:${id}`; },
    async exportFile(id, mimeType) { calls.push(["export", id, mimeType]); return `export:${id}`; },
    async createFile(input) { calls.push(["create", input]); return { id: "new", ...input }; },
    async updateFile(id, input) { calls.push(["update", id, input]); return { id, ...files[id], ...input }; },
    async moveFile(id, parentId) { calls.push(["move", id, parentId]); return { id, parents: [parentId] }; },
    async trashFile(id) { calls.push(["trash", id]); return { id, trashed: true }; },
    async listChanges() { return { changes: [], newStartPageToken: "next" }; },
  };
}

describe("DriveService", () => {
  test("lists the Notehub tree breadth-first with folders and supported files only", async () => {
    const service = new DriveService({ drive: fakeDrive(), rootId: "root" });

    await expect(service.tree()).resolves.toEqual([
      { id: "folder", name: "Projects", mimeType: "application/vnd.google-apps.folder", parents: ["root"] },
      { id: "txt", name: "b.txt", mimeType: "text/plain", parents: ["root"] },
      { id: "doc", name: "Google note", mimeType: "application/vnd.google-apps.document", parents: ["root"] },
      { id: "md", name: "a.md", mimeType: "text/markdown", parents: ["folder"] },
    ]);
  });

  test("reads raw Markdown/text and exports Google Docs as Markdown", async () => {
    const drive = fakeDrive();
    const service = new DriveService({ drive, rootId: "root" });

    await expect(service.read("md")).resolves.toEqual({ ...drive.files.md, markdown: "raw:md", editable: true });
    await expect(service.read("doc")).resolves.toEqual({ ...drive.files.doc, markdown: "export:doc", editable: false });
    expect(drive.calls).toEqual([["download", "md"], ["export", "doc", "text/markdown"]]);
  });

  test("enforces the root boundary for read, destinations, and non-permanent trash", async () => {
    const drive = fakeDrive();
    const service = new DriveService({ drive, rootId: "root" });

    await expect(service.read("outsider")).rejects.toMatchObject({ code: "BOUNDARY" });
    await expect(service.moveFile("md", "outsider")).rejects.toMatchObject({ code: "BOUNDARY" });
    await service.trashFile("md");
    expect(drive.calls).toContainEqual(["trash", "md"]);
  });

  test("creates and updates only raw Markdown files", async () => {
    const drive = fakeDrive();
    const service = new DriveService({ drive, rootId: "root" });

    await service.createFile({ name: "new.md", markdown: "# New", parentId: "folder" });
    await service.updateFile("md", { markdown: "# Changed" });
    await expect(service.updateFile("doc", { markdown: "no" })).rejects.toMatchObject({ code: "READ_ONLY" });
    await expect(service.updateFile("txt", { markdown: "no" })).rejects.toMatchObject({ code: "READ_ONLY" });
    expect(drive.calls).toContainEqual(["create", { name: "new.md", markdown: "# New", parentId: "folder", mimeType: "text/markdown" }]);
    expect(drive.calls).toContainEqual(["update", "md", { markdown: "# Changed", mimeType: "text/markdown" }]);
  });

  test("rejects moving a folder into its own descendant", async () => {
    const drive = fakeDrive();
    drive.files.subfolder = { id: "subfolder", name: "Nested", mimeType: "application/vnd.google-apps.folder", parents: ["folder"] };
    const service = new DriveService({ drive, rootId: "root" });

    await expect(service.moveFolder("folder", "subfolder")).rejects.toMatchObject({ code: "BOUNDARY" });
  });
});
