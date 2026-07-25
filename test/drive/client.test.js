import { describe, expect, test } from "vitest";
import { DriveBffClient, DriveClientError } from "../../src/drive/client.js";

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("DriveBffClient", () => {
  test("uses the Supabase bearer token with the BFF route and method contracts", async () => {
    const requests = [];
    const client = new DriveBffClient({
      getAccessToken: async () => "supabase-access-token",
      fetch: async (url, options) => {
        requests.push({ url, options });
        return response(200, url.includes("changes") ? { changes: [], pageToken: "next" } : { connected: true });
      },
    });

    await client.connection();
    await client.oauthStart();
    await client.changes(["known-note"]);
    await client.updateFile("note-1", { markdown: "# New" });
    await client.createFolder({ name: "Ideas", parentId: "root" });
    await client.trashFolder("folder-1");

    expect(requests).toEqual([
      expect.objectContaining({ url: "/api/drive/connection", options: expect.objectContaining({ method: "GET", headers: { authorization: "Bearer supabase-access-token" } }) }),
      expect.objectContaining({ url: "/api/drive/oauth/start", options: expect.objectContaining({ method: "GET", headers: { authorization: "Bearer supabase-access-token" } }) }),
      expect.objectContaining({ url: "/api/drive/changes", options: expect.objectContaining({ method: "POST", body: JSON.stringify({ knownIds: ["known-note"] }) }) }),
      expect.objectContaining({ url: "/api/drive/file/update?id=note-1", options: expect.objectContaining({ method: "PATCH", body: JSON.stringify({ markdown: "# New" }) }) }),
      expect.objectContaining({ url: "/api/drive/folder/create", options: expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "Ideas", parentId: "root" }) }) }),
      expect.objectContaining({ url: "/api/drive/folder/trash?id=folder-1", options: expect.objectContaining({ method: "DELETE" }) }),
    ]);
  });

  test("raises a typed error using only the BFF's safe error payload", async () => {
    const client = new DriveBffClient({
      getAccessToken: async () => "secret-token",
      fetch: async () => response(409, { error: { code: "READ_ONLY", message: "Google Docs are read-only", refreshToken: "must-not-leak" } }),
    });

    await expect(client.trashFile("document")).rejects.toEqual(expect.objectContaining({ name: "DriveClientError", code: "READ_ONLY", status: 409, message: "Google Docs are read-only" }));
    await expect(client.trashFile("document")).rejects.not.toMatchObject({ refreshToken: "must-not-leak" });
    expect(DriveClientError).toBeTypeOf("function");
  });

  test("does not send an unauthenticated BFF request when no Supabase access token exists", async () => {
    let called = false;
    const client = new DriveBffClient({ getAccessToken: async () => null, fetch: async () => { called = true; return response(200, {}); } });

    await expect(client.tree()).rejects.toEqual(expect.objectContaining({ code: "AUTH", status: 401 }));

    expect(called).toBe(false);
  });

  test("forwards a stable create operation ID to the BFF", async () => {
    const requests = [];
    const client = new DriveBffClient({ getAccessToken: async () => "access", fetch: async (url, options) => { requests.push({ url, options }); return response(201, { id: "file" }); } });

    await client.createFile({ name: "Note.md", markdown: "body", parentId: "root", operationId: "create-123" });

    expect(requests[0]).toEqual(expect.objectContaining({ url: "/api/drive/file/create", options: expect.objectContaining({ body: JSON.stringify({ name: "Note.md", markdown: "body", parentId: "root", operationId: "create-123" }) }) }));
  });
});
