import { expect, test } from "vitest";
import config from "../vercel.json" with { type: "json" };

test("routes Vercel Functions before the SPA fallback", () => {
  expect(config.routes).toEqual([
    { src: "/api/drive/(.*)", dest: "/api/drive/[...path]" },
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" },
  ]);
});
