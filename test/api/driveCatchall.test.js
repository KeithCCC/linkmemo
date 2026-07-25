import { describe, expect, test } from "vitest";
import driveHandler from "../../api/drive/[...path].js";

function responseRecorder() {
  return {
    statusCode: null,
    body: undefined,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.body = null; return this; },
  };
}

describe("Drive catch-all route", () => {
  test("keeps file-create method validation behind one Vercel function", async () => {
    const res = responseRecorder();

    await driveHandler({ method: "GET", query: { path: ["file", "create"] } }, res);

    expect(res).toMatchObject({
      statusCode: 405,
      headers: { allow: "POST" },
      body: { error: { code: "METHOD_NOT_ALLOWED" } },
    });
  });
});
