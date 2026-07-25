import "fake-indexeddb/auto";
import { describe, expect, test } from "vitest";
import { NotehubRepository } from "../../src/drive/repository.js";

function repository(options = {}) {
  const name = `notehub-repository-${crypto.randomUUID()}`;
  return new NotehubRepository({ name, ...options });
}

describe("NotehubRepository", () => {
  test("persists normalized notes, folders, FIFO outbox entries, and metadata", async () => {
    const repo = repository();

    await repo.upsertNote({ id: "note-1", title: "First", source: "drive-markdown", editable: true });
    await repo.upsertFolder({ id: "folder-1", name: "Work", parentId: null });
    const first = await repo.enqueue({ type: "file.update", id: "note-1", payload: { markdown: "A" } });
    const second = await repo.enqueue({ type: "file.move", id: "note-1", payload: { parentId: "folder-1" } });
    await repo.setMetadata("changePageToken", "page-2");

    expect(await repo.listNotes()).toEqual([{ id: "note-1", title: "First", source: "drive-markdown", editable: true }]);
    expect(await repo.getNote("note-1")).toMatchObject({ title: "First" });
    expect(await repo.listFolders()).toEqual([{ id: "folder-1", name: "Work", parentId: null }]);
    expect(await repo.listOutbox()).toEqual([expect.objectContaining({ id: first.id, sequence: 1 }), expect.objectContaining({ id: second.id, sequence: 2 })]);
    expect(await repo.getMetadata("changePageToken")).toBe("page-2");
  });

  test("replaceAll atomically replaces both cache collections", async () => {
    const repo = repository();
    await repo.upsertNote({ id: "old" });
    await repo.upsertFolder({ id: "old-folder" });

    await repo.replaceAll({ notes: [{ id: "new" }], folders: [{ id: "new-folder" }] });

    expect(await repo.listNotes()).toEqual([{ id: "new" }]);
    expect(await repo.listFolders()).toEqual([{ id: "new-folder" }]);
  });

  test("rolls back a local cache mutation when its outbox enqueue cannot commit", async () => {
    const repo = repository({ beforeTransactionCommit: () => { throw new Error("quota"); } });

    await expect(repo.mutateAndEnqueue({ note: { id: "local", title: "Unsaved" }, operation: { type: "file.create", id: "local", payload: {} } })).rejects.toThrow("quota");

    expect(await repo.listNotes()).toEqual([]);
    expect(await repo.listOutbox()).toEqual([]);
  });

  test("rolls back temporary-ID completion, child-parent rewrites, and outbox deletion together", async () => {
    const repo = repository();
    const created = await repo.mutateAndEnqueue({ folder: { id: "local:folder", name: "Local", parentId: "root" }, operation: { type: "folder.create", id: "local:folder", payload: {} } });
    await repo.mutateAndEnqueue({ note: { id: "child", parentId: "local:folder" }, operation: { type: "file.move", id: "child", payload: { parentId: "local:folder" } } });
    repo.beforeTransactionCommit = () => { throw new Error("interrupted"); };

    await expect(repo.completeTemporaryCreate({ kind: "folder", temporaryId: "local:folder", driveId: "drive-folder", item: { id: "drive-folder", name: "Remote", parentId: "root" }, sequence: created.sequence })).rejects.toThrow("interrupted");

    expect(await repo.getFolder("local:folder")).toEqual({ id: "local:folder", name: "Local", parentId: "root" });
    expect(await repo.getNote("child")).toEqual({ id: "child", parentId: "local:folder" });
    expect((await repo.listOutbox()).map((entry) => entry.id)).toEqual(["local:folder", "child"]);
  });
});
