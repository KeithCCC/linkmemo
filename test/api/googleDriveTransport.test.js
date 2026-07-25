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

    await transport.createFile({ name: "Note.md", markdown: "body", parentId: "folder", operationId: "create-123" });
    await expect(transport.findFileByOperation("folder", "create-123")).resolves.toEqual({ id: "existing" });

    expect(requests[0].options.body).toContain('"appProperties":{"notehubOperationId":"create-123"}');
    expect(new URL(requests[1].url).searchParams.get("q")).toContain("notehubOperationId");
    expect(new URL(requests[1].url).searchParams.get("q")).toContain("create-123");
  });
});
