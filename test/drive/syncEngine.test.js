import "fake-indexeddb/auto";
import { describe, expect, test } from "vitest";
import { NotehubRepository } from "../../src/drive/repository.js";
import { NotehubSyncEngine } from "../../src/drive/syncEngine.js";

function repo() {
  return new NotehubRepository({ name: `notehub-sync-${crypto.randomUUID()}` });
}

function markdownFile(id, name = "Note.md") {
  return { id, name, mimeType: "text/markdown", markdown: `---\ntitle: ${name}\ntags: []\nfocus: false\n---\nBody`, parents: ["root"] };
}

describe("NotehubSyncEngine", () => {
  test("hydrates IndexedDB before doing an initial recursive cache replacement", async () => {
    const repository = repo();
    await repository.upsertNote({ id: "cached", title: "Offline", source: "drive-markdown", editable: true });
    const client = {
      tree: async () => ({ items: [markdownFile("remote"), { id: "folder", name: "Projects", mimeType: "application/vnd.google-apps.folder", parents: ["root"] }] }),
      changes: async () => ({ changes: [], pageToken: "initial-token" }),
    };
    const engine = new NotehubSyncEngine({ repository, client });

    await engine.hydrate();
    expect(engine.notes).toEqual([expect.objectContaining({ id: "cached", title: "Offline" })]);
    expect(engine.state).toBe("offline");

    await engine.sync();
    expect(engine.state).toBe("synced");
    expect(await repository.listNotes()).toEqual([expect.objectContaining({ id: "remote", title: "Note.md" })]);
    expect(await repository.listFolders()).toEqual([{ id: "folder", name: "Projects", parentId: "root" }]);
    expect(await repository.getMetadata("changePageToken")).toBe("initial-token");
  });

  test("applies delta removals and persists a returned token only after applying them", async () => {
    const repository = repo();
    await repository.replaceAll({ notes: [{ id: "gone" }, { id: "kept" }], folders: [] });
    await repository.setMetadata("changePageToken", "old-token");
    const client = { changes: async (knownIds) => ({ changes: [{ fileId: "gone", removed: true }, { fileId: "new", file: markdownFile("new", "New.md") }], pageToken: "new-token" }) };
    const engine = new NotehubSyncEngine({ repository, client });

    await engine.sync();

    expect(await repository.listNotes()).toEqual([{ id: "kept" }, expect.objectContaining({ id: "new", title: "New.md" })]);
    expect(await repository.getMetadata("changePageToken")).toBe("new-token");
  });

  test("does not advance the change token when applying a delta fails", async () => {
    const repository = repo();
    await repository.setMetadata("changePageToken", "old-token");
    const upsertNote = repository.upsertNote.bind(repository);
    repository.upsertNote = async (note) => {
      if (note.id === "broken") throw new Error("disk full");
      return upsertNote(note);
    };
    const engine = new NotehubSyncEngine({ repository, client: { changes: async () => ({ changes: [{ fileId: "broken", file: markdownFile("broken") }], pageToken: "new-token" }) } });

    await expect(engine.sync()).rejects.toThrow("disk full");

    expect(await repository.getMetadata("changePageToken")).toBe("old-token");
    expect(engine.state).toBe("error");
  });

  test("keeps a local edit through reload when its FIFO operation fails", async () => {
    const repository = repo();
    await repository.upsertNote({ id: "note", title: "Before", content: "old", source: "drive-markdown", editable: true });
    const engine = new NotehubSyncEngine({ repository, client: { updateFile: async () => { throw new Error("offline"); } } });

    await engine.updateNote("note", { content: "local change" });
    await expect(engine.flushOutbox()).rejects.toThrow("offline");
    const reloaded = new NotehubSyncEngine({ repository, client: {} });
    await reloaded.hydrate();

    expect(reloaded.notes).toEqual([expect.objectContaining({ id: "note", content: "local change" })]);
    expect(await repository.listOutbox()).toHaveLength(1);
    expect(engine.state).toBe("error");
  });

  test("serializes normalized local note fields into Markdown for the Drive outbox", async () => {
    const repository = repo();
    await repository.upsertNote({ id: "note", title: "Before", content: "old", tags: ["work"], focus: true, createdAt: "2026-01-01T00:00:00.000Z", source: "drive-markdown", editable: true });
    const sent = [];
    const engine = new NotehubSyncEngine({ repository, client: { updateFile: async (_id, payload) => sent.push(payload) } });

    await engine.updateNote("note", { title: "After", content: "new body" });
    await engine.flushOutbox();

    expect(sent).toEqual([expect.objectContaining({ name: "After", markdown: expect.stringContaining("title: After\n") })]);
    expect(sent[0].markdown).toContain("new body");
    expect(sent[0].markdown).toContain("tags:\n  - work");
  });

  test("hydrates a temporary offline create and edit after reload", async () => {
    const repository = repo();
    const engine = new NotehubSyncEngine({ repository, client: {} });

    const id = await engine.createNote({ title: "Offline", content: "first" });
    await engine.updateNote(id, { content: "revised" });
    const reloaded = new NotehubSyncEngine({ repository, client: {} });
    await reloaded.hydrate();

    expect(id).toMatch(/^local:/);
    expect(reloaded.notes).toEqual([expect.objectContaining({ id, content: "revised" })]);
    expect(await repository.listOutbox()).toHaveLength(2);
  });

  test("stops FIFO flushing after the first failed operation", async () => {
    const repository = repo();
    await repository.enqueue({ type: "file.update", id: "first", payload: { markdown: "one" } });
    await repository.enqueue({ type: "file.update", id: "second", payload: { markdown: "two" } });
    const attempted = [];
    const engine = new NotehubSyncEngine({ repository, client: { updateFile: async (id) => { attempted.push(id); throw new Error("blocked"); } } });

    await expect(engine.flushOutbox()).rejects.toThrow("blocked");

    expect(attempted).toEqual(["first"]);
    expect((await repository.listOutbox()).map((entry) => entry.id)).toEqual(["first", "second"]);
  });

  test("replaces temporary create IDs and rewrites later queued references", async () => {
    const repository = repo();
    const engine = new NotehubSyncEngine({ repository, client: { createFile: async () => markdownFile("drive-note", "Created.md"), moveFile: async () => ({}) } });
    const temporaryId = await engine.createNote({ title: "Created", content: "body", parentId: "root" });
    await engine.moveNote(temporaryId, "folder");

    await engine.flushOutbox();

    expect(await repository.getNote(temporaryId)).toBeUndefined();
    expect(await repository.getNote("drive-note")).toEqual(expect.objectContaining({ id: "drive-note", content: "body" }));
    expect(await repository.listOutbox()).toEqual([]);
  });

  test("rewrites a child operation when a temporary folder receives its Drive ID", async () => {
    const repository = repo();
    const parents = [];
    const engine = new NotehubSyncEngine({
      repository,
      client: {
        createFolder: async () => ({ id: "drive-folder", name: "Ideas", mimeType: "application/vnd.google-apps.folder", parents: ["root"] }),
        createFile: async (payload) => { parents.push(payload.parentId); return markdownFile("drive-note"); },
      },
    });
    const folderId = await engine.createFolder({ name: "Ideas", parentId: "root" });
    await engine.createNote({ title: "Child", content: "body", parentId: folderId });

    await engine.flushOutbox();

    expect(await repository.getFolder(folderId)).toBeUndefined();
    expect(await repository.getFolder("drive-folder")).toEqual({ id: "drive-folder", name: "Ideas", parentId: "root" });
    expect(parents).toEqual(["drive-folder"]);
  });

  test("does not queue writes for cached Google Docs and exposes sync failures", async () => {
    const repository = repo();
    await repository.upsertNote({ id: "doc", source: "drive-doc", editable: false, title: "Read only" });
    const engine = new NotehubSyncEngine({ repository, client: { tree: async () => { throw new Error("unavailable"); } } });

    await engine.hydrate();
    await engine.updateNote("doc", { content: "nope" });
    await expect(engine.sync()).rejects.toThrow("unavailable");

    expect(await repository.listOutbox()).toEqual([]);
    expect(engine.state).toBe("error");
  });
});
