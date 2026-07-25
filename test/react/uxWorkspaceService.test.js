import { describe, expect, test } from "vitest";
import * as uxServices from "../../src/services/dummyNotesService.js";

describe("UX test Notehub workspace", () => {
  test("provides deterministic Drive folders, editable Markdown, read-only Docs, Legacy, and connection state", async () => {
    const first = uxServices.createUxDriveService();
    const second = uxServices.createUxDriveService();

    await first.hydrate();
    await second.hydrate();

    expect(first.snapshot()).toEqual(second.snapshot());
    expect(first.snapshot()).toMatchObject({
      state: "synced",
      folders: expect.arrayContaining([
        expect.objectContaining({ id: "ux-folder-projects", name: "Projects" }),
        expect.objectContaining({ id: "ux-folder-sprint", parentId: "ux-folder-projects" }),
      ]),
      notes: expect.arrayContaining([
        expect.objectContaining({ source: "drive-markdown", editable: true }),
        expect.objectContaining({ source: "drive-doc", editable: false }),
      ]),
    });
    await expect(first.client.connection()).resolves.toEqual({ connected: true, folderId: "ux-notehub-root", grantedScope: "drive" });
    await expect(uxServices.uxLegacyNotesService.list("ux-test-user")).resolves.toEqual([
      expect.objectContaining({ source: "legacy", editable: false }),
    ]);
  });

  test("keeps UX mutations local-first and exposes deterministic Settings actions", async () => {
    const service = uxServices.createUxDriveService();
    await service.hydrate();
    const id = await service.createNote({ title: "UX local note", content: "Body", parentId: "ux-folder-sprint" });

    expect(id).toMatch(/^local:ux-/);
    expect(service.snapshot()).toMatchObject({
      state: "pending",
      notes: expect.arrayContaining([expect.objectContaining({ id, title: "UX local note" })]),
    });
    await service.flushOutbox();
    expect(service.snapshot().state).toBe("synced");
    await expect(service.client.oauthStart()).resolves.toEqual({ authorizationUrl: "/settings?ux_oauth=complete" });
    await expect(service.client.updateConnection("ux-new-root")).resolves.toEqual({ connected: true, folderId: "ux-new-root", grantedScope: "drive" });
  });
});
