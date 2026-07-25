import "fake-indexeddb/auto";
import { describe, expect, test } from "vitest";
import { NotehubRepository } from "../../src/drive/repository.js";

function repository() {
  const name = `notehub-repository-${crypto.randomUUID()}`;
  return new NotehubRepository({ name });
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
});
