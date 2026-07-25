import { describe, expect, test } from "vitest";

const entrypoints = ["../../api/drive/[...path].js"];

describe("Vercel Drive entrypoint", () => {
  test.each(entrypoints)("imports %s", async (entrypoint) => {
    const module = await import(entrypoint);
    expect(module.default).toEqual(expect.any(Function));
  });
});
