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
});
