import { describe, expect, test } from "vitest";
import connection from "../../api/drive/connection.js";
import trashFile from "../../api/drive/file/trash.js";
import createFile from "../../api/drive/file/create.js";

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
  test("rejects GET for destructive file routes before runtime configuration", async () => {
    const res = responseRecorder();
    await trashFile({ method: "GET" }, res);
    expect(res).toMatchObject({ statusCode: 405, body: { error: { code: "METHOD_NOT_ALLOWED" } }, headers: { allow: "DELETE" } });
  });

  test("requires an explicit PATCH to change the selected root", async () => {
    const res = responseRecorder();
    await connection({ method: "POST" }, res);
    expect(res).toMatchObject({ statusCode: 405, body: { error: { code: "METHOD_NOT_ALLOWED" } }, headers: { allow: "GET, PATCH" } });
  });

  test("rejects GET for file creation", async () => {
    const res = responseRecorder();
    await createFile({ method: "GET" }, res);
    expect(res.statusCode).toBe(405);
  });
});
