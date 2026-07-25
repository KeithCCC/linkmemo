import { describe, expect, test } from "vitest";
import { generateMarkdownFileName } from "../../src/drive/fileName.js";

describe("generateMarkdownFileName", () => {
  test("keeps Japanese and Latin title text while making a safe Markdown name", () => {
    expect(generateMarkdownFileName("東京 / Tokyo: plans?*")).toBe("東京-Tokyo-plans.md");
  });

  test("adds the next numeric suffix when a sibling name already exists", () => {
    expect(
      generateMarkdownFileName("東京 / Tokyo: plans?*", new Set(["東京-Tokyo-plans.md", "東京-Tokyo-plans-2.md"]))
    ).toBe("東京-Tokyo-plans-3.md");
  });

  test("avoids Windows reserved device filenames", () => {
    expect(generateMarkdownFileName("CON")).toBe("Untitled.md");
  });
});
