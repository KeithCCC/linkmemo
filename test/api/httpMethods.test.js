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

describe("Drive HTTP method allow-lists", () => {
  const request = (method, path) => ({ method, query: { path } });

  test("rejects GET for destructive file routes before runtime configuration", async () => {
    const res = responseRecorder();
    await driveHandler(request("GET", ["file", "trash"]), res);
    expect(res).toMatchObject({ statusCode: 405, body: { error: { code: "METHOD_NOT_ALLOWED" } }, headers: { allow: "DELETE" } });
  });

  test("requires an explicit PATCH to change the selected root", async () => {
    const res = responseRecorder();
    await driveHandler(request("POST", ["connection"]), res);
    expect(res).toMatchObject({ statusCode: 405, body: { error: { code: "METHOD_NOT_ALLOWED" } }, headers: { allow: "GET, PATCH" } });
  });

  test("rejects GET for file creation", async () => {
    const res = responseRecorder();
    await driveHandler(request("GET", ["file", "create"]), res);
    expect(res.statusCode).toBe(405);
  });

  test("requires DELETE for folder trash", async () => {
    const res = responseRecorder();
    await driveHandler(request("POST", ["folder", "trash"]), res);
    expect(res).toMatchObject({ statusCode: 405, body: { error: { code: "METHOD_NOT_ALLOWED" } }, headers: { allow: "DELETE" } });
  });
});
