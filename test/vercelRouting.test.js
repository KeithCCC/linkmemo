import { expect, test } from "vitest";
import config from "../vercel.json" with { type: "json" };

test("routes Vercel Functions before the SPA fallback", () => {
  expect(config.routes).toEqual([
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" },
  ]);
});
