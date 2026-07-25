import { describe, expect, test } from "vitest";
import { GoogleDriveTransport } from "../../api/drive/googleDriveTransport.js";

describe("Google Drive REST transport", () => {
  test("uses injected fetch and maps rate limits to safe upstream errors", async () => {
    const requests = [];
    const transport = new GoogleDriveTransport({
      accessToken: "access-token",
      fetch: async (url, options) => {
        requests.push([url, options]);
        return new Response(JSON.stringify({ id: "file", parents: ["root"] }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });
    await expect(transport.getFile("file")).resolves.toEqual({ id: "file", parents: ["root"] });
    expect(requests[0][0]).toContain("/drive/v3/files/file?");
    expect(requests[0][1].headers.authorization).toBe("Bearer access-token");
  });

  test("aggregates every page of folder children", async () => {
    const urls = [];
    const transport = new GoogleDriveTransport({
      accessToken: "access-token",
      fetch: async (url) => {
        urls.push(url);
        const hasSecondPageToken = new URL(url).searchParams.get("pageToken") === "second";
        return new Response(JSON.stringify(hasSecondPageToken ? { files: [{ id: "two" }] } : { files: [{ id: "one" }], nextPageToken: "second" }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });

    await expect(transport.listChildren("root")).resolves.toEqual([{ id: "one" }, { id: "two" }]);
    expect(urls).toHaveLength(2);
  });

  test("stores and finds private operation markers within the validated parent", async () => {
    const requests = [];
    const transport = new GoogleDriveTransport({
      accessToken: "access-token",
      fetch: async (url, options) => {
        requests.push({ url, options });
        return new Response(JSON.stringify(url.includes("q=") ? { files: [{ id: "existing" }] } : { id: "new" }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });

    const operationId = "f6656d52-4c35-4c11-9d0d-b0e1a8248393";
    await transport.createFile({ name: "Note.md", markdown: "body", parentId: "folder", operationId });
    await expect(transport.findFileByOperation("folder", operationId)).resolves.toEqual({ id: "existing" });

    expect(requests[0].options.body).toContain(`"appProperties":{"notehubOperationId":"${operationId}"}`);
    expect(new URL(requests[1].url).searchParams.get("q")).toContain("notehubOperationId");
    expect(new URL(requests[1].url).searchParams.get("q")).toContain(operationId);
  });

  test("rejects missing and query-like operation IDs without constructing a Drive query", async () => {
    let called = false;
    const transport = new GoogleDriveTransport({ accessToken: "access-token", fetch: async () => { called = true; return new Response("{}", { status: 200 }); } });

    await expect(transport.findFileByOperation("folder", "x' or trashed = false")).rejects.toMatchObject({ code: "VALIDATION", status: 400 });
    await expect(transport.createFile({ name: "Note.md", markdown: "body", parentId: "folder" })).rejects.toMatchObject({ code: "VALIDATION", status: 400 });

    expect(called).toBe(false);
  });
});
