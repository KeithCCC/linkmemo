import { describe, expect, test } from "vitest";
import { DriveService } from "../../server/drive/service.js";

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
    async createFolder(input) { calls.push(["createFolder", input]); return { id: "new-folder", ...input }; },
    async updateFile(id, input) { calls.push(["update", id, input]); return { id, ...files[id], ...input }; },
    async moveFile(id, parentId) { calls.push(["move", id, parentId]); return { id, parents: [parentId] }; },
    async trashFile(id) { calls.push(["trash", id]); return { id, trashed: true }; },
    async listChanges() { return { changes: [], newStartPageToken: "next" }; },
  };
}

const operationId = "f6656d52-4c35-4c11-9d0d-b0e1a8248393";

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
    await expect(service.read("txt")).resolves.toEqual({ ...drive.files.txt, markdown: "raw:txt", editable: false });
    expect(drive.calls).toEqual([["download", "md"], ["export", "doc", "text/markdown"], ["download", "txt"]]);
  });

  test("enforces the root boundary for read, destinations, and non-permanent trash", async () => {
    const drive = fakeDrive();
    const service = new DriveService({ drive, rootId: "root" });

    await expect(service.read("outsider")).rejects.toMatchObject({ code: "BOUNDARY" });
    await expect(service.moveFile("md", "outsider")).rejects.toMatchObject({ code: "BOUNDARY" });
    await service.trashFile("md");
    expect(drive.calls).toContainEqual(["trash", "md"]);
  });

  test("trashes only raw Markdown notes, never folders or read-only file types", async () => {
    const drive = fakeDrive();
    const service = new DriveService({ drive, rootId: "root" });

    await expect(service.trashFile("folder")).rejects.toMatchObject({ code: "READ_ONLY" });
    await expect(service.trashFile("doc")).rejects.toMatchObject({ code: "READ_ONLY" });
    await expect(service.trashFile("txt")).rejects.toMatchObject({ code: "READ_ONLY" });
    await expect(service.trashFile("pdf")).rejects.toMatchObject({ code: "READ_ONLY" });
    expect(drive.calls).toEqual([]);
  });

  test("trashes only descendant folders and never the Notehub root or non-folder items", async () => {
    const drive = fakeDrive();
    const service = new DriveService({ drive, rootId: "root" });

    await expect(service.trashFolder("folder")).resolves.toEqual({ id: "folder", trashed: true });
    await expect(service.trashFolder("root")).rejects.toMatchObject({ code: "BOUNDARY" });
    await expect(service.trashFolder("md")).rejects.toMatchObject({ code: "BOUNDARY" });
    await expect(service.trashFolder("outsider")).rejects.toMatchObject({ code: "BOUNDARY" });

    expect(drive.calls).toEqual([["trash", "folder"]]);
  });

  test("does not move plain text because only raw Markdown is writable", async () => {
    const drive = fakeDrive();
    const service = new DriveService({ drive, rootId: "root" });

    await expect(service.moveFile("txt", "folder")).rejects.toMatchObject({ code: "READ_ONLY" });

    expect(drive.calls).toEqual([]);
  });

  test("creates and updates only raw Markdown files", async () => {
    const drive = fakeDrive();
    const service = new DriveService({ drive, rootId: "root" });

    await service.createFile({ name: "new.md", markdown: "# New", parentId: "folder", operationId });
    await service.updateFile("md", { markdown: "# Changed" });
    await expect(service.updateFile("doc", { markdown: "no" })).rejects.toMatchObject({ code: "READ_ONLY" });
    await expect(service.updateFile("txt", { markdown: "no" })).rejects.toMatchObject({ code: "READ_ONLY" });
    expect(drive.calls).toContainEqual(["create", { name: "new.md", markdown: "# New", parentId: "folder", mimeType: "text/markdown", operationId }]);
    expect(drive.calls).toContainEqual(["update", "md", { markdown: "# Changed", mimeType: "text/markdown" }]);
  });

  test("reuses a validated parent child with the same private create operation marker", async () => {
    const drive = fakeDrive();
    drive.findFileByOperation = async (parentId, operationId) => ({ id: "existing", name: "Already.md", mimeType: "text/markdown", parents: [parentId], appProperties: { notehubOperationId: operationId } });
    const service = new DriveService({ drive, rootId: "root" });

    await expect(service.createFile({ name: "Again.md", markdown: "body", parentId: "folder", operationId })).resolves.toMatchObject({ id: "existing" });

    expect(drive.calls).not.toContainEqual(expect.arrayContaining(["create"]));
  });

  test("rejects moving a folder into its own descendant", async () => {
    const drive = fakeDrive();
    drive.files.subfolder = { id: "subfolder", name: "Nested", mimeType: "application/vnd.google-apps.folder", parents: ["folder"] };
    const service = new DriveService({ drive, rootId: "root" });

    await expect(service.moveFolder("folder", "subfolder")).rejects.toMatchObject({ code: "BOUNDARY" });
  });

  test("uses the Notehub root for null file and folder destinations", async () => {
    const drive = fakeDrive();
    const service = new DriveService({ drive, rootId: "root" });

    await service.createFile({ name: "root.md", markdown: "body", parentId: null, operationId });
    await service.createFolder({ name: "Root folder", parentId: null, operationId });
    await service.moveFile("md", null);
    await service.moveFolder("folder", null);

    expect(drive.calls).toContainEqual(["create", { name: "root.md", markdown: "body", parentId: "root", mimeType: "text/markdown", operationId }]);
    expect(drive.calls).toContainEqual(["createFolder", { name: "Root folder", parentId: "root", operationId }]);
    expect(drive.calls).toContainEqual(["move", "md", "root"]);
    expect(drive.calls).toContainEqual(["move", "folder", "root"]);
  });

  test("rejects missing and injection-like create operation IDs before Drive queries", async () => {
    const drive = fakeDrive();
    let lookups = 0;
    drive.findFileByOperation = async () => { lookups += 1; return null; };
    const service = new DriveService({ drive, rootId: "root" });

    await expect(service.createFile({ name: "bad.md", markdown: "body", parentId: "root" })).rejects.toMatchObject({ code: "VALIDATION", status: 400 });
    await expect(service.createFolder({ name: "bad", parentId: "root", operationId: "x' or trashed = false" })).rejects.toMatchObject({ code: "VALIDATION", status: 400 });

    expect(lookups).toBe(0);
    expect(drive.calls).toEqual([]);
  });
});
