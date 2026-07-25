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

function metadataFile(id, name = "Note.md") {
  return { id, name, mimeType: "text/markdown", parents: ["root"], createdTime: "2026-01-01T00:00:00.000Z", modifiedTime: "2026-01-01T00:00:00.000Z" };
}

describe("NotehubSyncEngine", () => {
  test("hydrates IndexedDB before doing an initial recursive cache replacement", async () => {
    const repository = repo();
    await repository.upsertNote({ id: "cached", title: "Offline", source: "drive-markdown", editable: true });
    const client = {
      tree: async () => ({ items: [metadataFile("remote"), { id: "folder", name: "Projects", mimeType: "application/vnd.google-apps.folder", parents: ["root"] }] }),
      changes: async () => ({ changes: [], pageToken: "initial-token" }),
      readFile: async () => markdownFile("remote"),
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
    const client = { changes: async () => ({ changes: [{ fileId: "gone", removed: true }, { fileId: "new", file: metadataFile("new", "New.md") }], pageToken: "new-token" }), readFile: async () => markdownFile("new", "New.md") };
    const engine = new NotehubSyncEngine({ repository, client });

    await engine.sync();

    expect(await repository.listNotes()).toEqual([{ id: "kept" }, expect.objectContaining({ id: "new", title: "New.md" })]);
    expect(await repository.getMetadata("changePageToken")).toBe("new-token");
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

  test("keeps a recoverable tombstone until a queued remote trash succeeds", async () => {
    const repository = repo();
    await repository.upsertNote({ id: "note", title: "Keep", content: "content", source: "drive-markdown", editable: true });
    const engine = new NotehubSyncEngine({ repository, client: { trashFile: async () => { throw new Error("offline"); } } });

    await engine.trashNote("note");
    await expect(engine.flushOutbox()).rejects.toThrow("offline");

    expect(await repository.getNote("note")).toEqual(expect.objectContaining({ trashed: true, content: "content" }));
    expect(await repository.listOutbox()).toHaveLength(1);
  });

  test("keeps a folder subtree recoverable until queued remote trash succeeds", async () => {
    const repository = repo();
    await repository.upsertFolder({ id: "folder", name: "Projects", parentId: "root" });
    await repository.upsertFolder({ id: "child-folder", name: "Nested", parentId: "folder" });
    await repository.upsertNote({ id: "child-note", title: "Draft", parentId: "child-folder", source: "drive-markdown", editable: true });
    const engine = new NotehubSyncEngine({ repository, client: { trashFolder: async () => { throw new Error("offline"); } } });

    await engine.trashFolder("folder");
    await expect(engine.flushOutbox()).rejects.toThrow("offline");

    expect(engine.folders).toEqual([expect.objectContaining({ id: "child-folder" })]);
    expect(await repository.getFolder("folder")).toMatchObject({ trashed: true, pendingTrash: true });
    expect(await repository.getFolder("child-folder")).toMatchObject({ parentId: "folder" });
    expect(await repository.getNote("child-note")).toMatchObject({ parentId: "child-folder" });
    expect(await repository.listOutbox()).toHaveLength(1);
  });

  test("removes a folder subtree after queued remote trash succeeds", async () => {
    const repository = repo();
    await repository.upsertFolder({ id: "folder", name: "Projects", parentId: "root" });
    await repository.upsertFolder({ id: "child-folder", name: "Nested", parentId: "folder" });
    await repository.upsertNote({ id: "child-note", title: "Draft", parentId: "child-folder", source: "drive-markdown", editable: true });
    const trashed = [];
    const engine = new NotehubSyncEngine({ repository, client: { trashFolder: async (id) => { trashed.push(id); return { id, trashed: true }; } } });

    await engine.trashFolder("folder");
    await engine.flushOutbox();

    expect(trashed).toEqual(["folder"]);
    expect(await repository.listFolders()).toEqual([]);
    expect(await repository.listNotes()).toEqual([]);
    expect(await repository.listOutbox()).toEqual([]);
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
    const engine = new NotehubSyncEngine({ repository, client: { createFile: async () => metadataFile("drive-note", "Created.md"), readFile: async () => markdownFile("drive-note", "Created.md"), moveFile: async () => ({}) } });
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
        createFile: async (payload) => { parents.push(payload.parentId); return metadataFile("drive-note"); },
        readFile: async () => markdownFile("drive-note"),
      },
    });
    const folderId = await engine.createFolder({ name: "Ideas", parentId: "root" });
    const childId = await engine.createNote({ title: "Child", content: "body", parentId: folderId });
    await repository.upsertFolder({ id: "cached-child-folder", name: "Child folder", parentId: folderId });

    await engine.flushOutbox();

    expect(await repository.getFolder(folderId)).toBeUndefined();
    expect(await repository.getFolder("drive-folder")).toEqual({ id: "drive-folder", name: "Ideas", parentId: "root" });
    expect(await repository.getFolder("cached-child-folder")).toEqual({ id: "cached-child-folder", name: "Child folder", parentId: "drive-folder" });
    expect(await repository.getNote("drive-note")).toEqual(expect.objectContaining({ parentId: "drive-folder" }));
    expect(childId).toMatch(/^local:/);
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

  test("hydrates real BFF tree metadata through file reads before normalizing notes", async () => {
    const repository = repo();
    const engine = new NotehubSyncEngine({
      repository,
      client: {
        tree: async () => ({ items: [metadataFile("remote")] }),
        changes: async () => ({ changes: [], pageToken: "server-cursor" }),
        readFile: async () => ({ ...metadataFile("remote"), markdown: "---\ntitle: Hydrated\ntags: []\nfocus: false\n---\nTree body", editable: true }),
      },
    });

    await engine.sync();

    expect(await repository.getNote("remote")).toEqual(expect.objectContaining({ title: "Hydrated", content: "Tree body" }));
  });

  test("recovers with a full tree when a server-advanced delta cannot be hydrated", async () => {
    const repository = repo();
    await repository.setMetadata("changePageToken", "diagnostic-token");
    let changesCalls = 0;
    const engine = new NotehubSyncEngine({
      repository,
      client: {
        changes: async () => {
          changesCalls += 1;
          return changesCalls === 1
            ? { changes: [{ fileId: "missed", file: metadataFile("missed") }], pageToken: "advanced-server-cursor" }
            : { changes: [], pageToken: "recovered-server-cursor" };
        },
        readFile: async (id) => {
          if (id === "missed") throw new Error("read interrupted");
          return { ...metadataFile("recovered"), markdown: "---\ntitle: Recovered\ntags: []\nfocus: false\n---\nRecovered body", editable: true };
        },
        tree: async () => ({ items: [metadataFile("recovered")] }),
      },
    });

    await engine.sync();

    expect(engine.state).toBe("synced");
    expect(await repository.getNote("recovered")).toEqual(expect.objectContaining({ content: "Recovered body" }));
    expect(await repository.getMetadata("changePageToken")).toBe("recovered-server-cursor");
  });

  test("serializes a concurrent sync and local create so the tree cannot erase local work", async () => {
    const repository = repo();
    let releaseTree;
    const treeStarted = new Promise((resolve) => { releaseTree = resolve; });
    let resumeTree;
    const treeGate = new Promise((resolve) => { resumeTree = resolve; });
    const engine = new NotehubSyncEngine({
      repository,
      client: {
        tree: async () => { releaseTree(); await treeGate; return { items: [] }; },
        changes: async () => ({ changes: [], pageToken: "cursor" }),
      },
    });

    const syncing = engine.sync();
    await treeStarted;
    const creating = engine.createNote({ title: "Concurrent", content: "safe" });
    resumeTree();
    const [, localId] = await Promise.all([syncing, creating]);

    expect(await repository.getNote(localId)).toEqual(expect.objectContaining({ content: "safe" }));
    expect(await repository.listOutbox()).toHaveLength(1);
  });

  test("uses note and folder cache IDs for BFF delta filtering and hydrates pending state", async () => {
    const repository = repo();
    await repository.upsertNote({ id: "note" });
    await repository.upsertFolder({ id: "folder" });
    await repository.enqueue({ type: "file.update", id: "note", payload: {} });
    await repository.setMetadata("changePageToken", "diagnostic-token");
    let knownIds;
    const engine = new NotehubSyncEngine({ repository, client: { updateFile: async () => ({}), changes: async (ids) => { knownIds = ids; return { changes: [{ fileId: "folder", removed: true }], pageToken: "cursor" }; } } });

    await engine.hydrate();
    expect(engine.state).toBe("pending");
    await engine.sync();

    expect(engine.state).toBe("synced");
    expect(knownIds).toEqual(expect.arrayContaining(["note", "folder"]));
    expect(await repository.getFolder("folder")).toBeUndefined();
  });

  test("preserves pending local tombstones and temporary records through a full-tree replacement", async () => {
    const repository = repo();
    await repository.mutateAndEnqueue({ note: { id: "local:temp", title: "Pending", content: "keep", source: "drive-markdown", editable: true }, operation: { type: "file.create", id: "local:temp", payload: {} } });
    await repository.mutateAndEnqueue({ note: { id: "trash", title: "Trash", content: "recover", source: "drive-markdown", editable: true, trashed: true }, operation: { type: "file.trash", id: "trash", payload: {} } });
    await repository.replaceRemoteCache({ notes: [{ id: "remote", title: "Remote" }], folders: [] });

    expect(await repository.getNote("local:temp")).toEqual(expect.objectContaining({ content: "keep" }));
    expect(await repository.getNote("trash")).toEqual(expect.objectContaining({ trashed: true, content: "recover" }));
  });

  test("executes a queued create once when concurrent flushes are requested", async () => {
    const repository = repo();
    let creates = 0;
    const engine = new NotehubSyncEngine({ repository, client: { createFile: async () => { creates += 1; return metadataFile("drive"); }, readFile: async () => markdownFile("drive") } });
    await engine.createNote({ title: "One", content: "body" });

    await Promise.all([engine.flushOutbox(), engine.flushOutbox()]);

    expect(await repository.listOutbox()).toEqual([]);
    expect(await repository.listNotes()).toEqual([expect.objectContaining({ id: "drive" })]);
    expect(creates).toBe(1);
  });

  test("completes a successful create without read hydration so retry cannot create it twice", async () => {
    const repository = repo();
    let creates = 0;
    const engine = new NotehubSyncEngine({ repository, client: {
      createFile: async () => { creates += 1; return metadataFile("drive-created", "Created.md"); },
      readFile: async () => { throw new Error("read unavailable"); },
    } });
    await engine.createNote({ title: "Created", content: "local body" });

    await engine.flushOutbox();
    await engine.flushOutbox();

    expect(creates).toBe(1);
    expect(await repository.listOutbox()).toEqual([]);
    expect(await repository.getNote("drive-created")).toEqual(expect.objectContaining({ content: "local body" }));
  });

  test("persists a stable operation ID with a queued create", async () => {
    const repository = repo();
    const engine = new NotehubSyncEngine({ repository, client: {} });

    await engine.createNote({ title: "Operation", content: "body" });

    expect(await repository.listOutbox()).toEqual([expect.objectContaining({ type: "file.create", operationId: expect.any(String) })]);
  });

  test("retries local completion with the same create operation ID after a transaction interruption", async () => {
    const repository = repo();
    const markers = [];
    const createdByMarker = new Map();
    const engine = new NotehubSyncEngine({ repository, client: {
      createFile: async ({ operationId }) => {
        markers.push(operationId);
        if (!createdByMarker.has(operationId)) createdByMarker.set(operationId, metadataFile("drive-retry"));
        return createdByMarker.get(operationId);
      },
    } });
    await engine.createNote({ title: "Retry", content: "body" });
    repository.beforeTransactionCommit = () => { throw new Error("local interruption"); };

    await expect(engine.flushOutbox()).rejects.toThrow("local interruption");
    repository.beforeTransactionCommit = undefined;
    await engine.flushOutbox();

    expect(markers).toHaveLength(2);
    expect(markers[0]).toBe(markers[1]);
    expect(createdByMarker).toHaveLength(1);
    expect(await repository.listOutbox()).toEqual([]);
  });
});
