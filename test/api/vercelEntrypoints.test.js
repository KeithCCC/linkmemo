import { describe, expect, test } from "vitest";

const entrypoints = [
  "../../api/drive/oauth/start.js",
  "../../api/drive/oauth/callback.js",
  "../../api/drive/connection.js",
  "../../api/drive/tree.js",
  "../../api/drive/changes.js",
  "../../api/drive/file/create.js",
  "../../api/drive/file/read.js",
  "../../api/drive/file/update.js",
  "../../api/drive/file/move.js",
  "../../api/drive/file/trash.js",
  "../../api/drive/folder/create.js",
  "../../api/drive/folder/rename.js",
  "../../api/drive/folder/move.js",
  "../../api/drive/folder/trash.js",
];

describe("Vercel Drive entrypoints", () => {
  test.each(entrypoints)("imports %s", async (entrypoint) => {
    const module = await import(entrypoint);
    expect(module.default).toEqual(expect.any(Function));
  });
});
