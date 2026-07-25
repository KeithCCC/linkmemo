// @vitest-environment node
import { expect, test } from "vitest";
import viteConfig from "../vite.config.js";

test("sets UX test mode without a tracked local environment file", () => {
  const config = typeof viteConfig === "function" ? viteConfig({ mode: "ux_test" }) : viteConfig;

  expect(config.define?.["import.meta.env.VITE_APP_MODE"]).toBe(JSON.stringify("ux_test"));
});
