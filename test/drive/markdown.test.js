import { describe, expect, test } from "vitest";
import { parseMarkdown, serializeMarkdown } from "../../src/drive/markdown.js";

describe("parseMarkdown", () => {
  test("parses valid front matter and preserves the Markdown body", () => {
    const result = parseMarkdown(
      "---\ntitle: Tokyo notes\ntags:\n  - travel\nfocus: true\ncreatedAt: 2026-01-02T03:04:05.000Z\nupdatedAt: 2026-01-03T04:05:06.000Z\nschemaVersion: 1\n---\n# Shibuya\n\nWalk around."
    );

    expect(result).toEqual({
      metadata: {
        title: "Tokyo notes",
        tags: ["travel"],
        focus: true,
        createdAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-03T04:05:06.000Z",
        schemaVersion: 1,
      },
      body: "# Shibuya\n\nWalk around.",
      warning: null,
    });
  });

  test("defaults missing or invalid metadata without changing the Markdown body", () => {
    const result = parseMarkdown("# Kept intact", { now: "2026-02-03T04:05:06.000Z" });

    expect(result).toEqual({
      metadata: {
        title: "Untitled",
        tags: [],
        focus: false,
        createdAt: "2026-02-03T04:05:06.000Z",
        updatedAt: "2026-02-03T04:05:06.000Z",
        schemaVersion: 1,
      },
      body: "# Kept intact",
      warning: null,
    });
  });

  test("replaces invalid front matter metadata while preserving its body", () => {
    const result = parseMarkdown(
      "---\ntitle: 37\ntags: not-a-list\nfocus: yes\ncreatedAt: yesterday\nupdatedAt: null\n---\n# Still here",
      { now: "2026-02-03T04:05:06.000Z" }
    );

    expect(result).toEqual({
      metadata: {
        title: "Untitled",
        tags: [],
        focus: false,
        createdAt: "2026-02-03T04:05:06.000Z",
        updatedAt: "2026-02-03T04:05:06.000Z",
        schemaVersion: 1,
      },
      body: "# Still here",
      warning: null,
    });
  });

  test("returns a warning and keeps all text when YAML front matter is malformed", () => {
    const source = "---\ntags: [broken\n---\n# Do not lose this";

    const result = parseMarkdown(source, { now: "2026-02-03T04:05:06.000Z" });

    expect(result).toEqual({
      metadata: {
        title: "Untitled",
        tags: [],
        focus: false,
        createdAt: "2026-02-03T04:05:06.000Z",
        updatedAt: "2026-02-03T04:05:06.000Z",
        schemaVersion: 1,
      },
      body: source,
      warning: "Unable to parse YAML front matter",
    });
  });

  test("warns without discarding text when the front matter delimiter is unclosed", () => {
    const source = "---\ntitle: Interrupted\n# Body remains visible";

    expect(parseMarkdown(source, { now: "2026-02-03T04:05:06.000Z" })).toEqual({
      metadata: {
        title: "Untitled",
        tags: [],
        focus: false,
        createdAt: "2026-02-03T04:05:06.000Z",
        updatedAt: "2026-02-03T04:05:06.000Z",
        schemaVersion: 1,
      },
      body: source,
      warning: "Unable to parse YAML front matter",
    });
  });

  test("accepts an empty front matter mapping", () => {
    expect(parseMarkdown("---\n---\n# Body", { now: "2026-02-03T04:05:06.000Z" })).toEqual({
      metadata: {
        title: "Untitled",
        tags: [],
        focus: false,
        createdAt: "2026-02-03T04:05:06.000Z",
        updatedAt: "2026-02-03T04:05:06.000Z",
        schemaVersion: 1,
      },
      body: "# Body",
      warning: null,
    });
  });
});

describe("serializeMarkdown", () => {
  test("writes deterministic front matter keys before the Markdown body", () => {
    const result = serializeMarkdown({
      metadata: {
        tags: ["work", "to do"],
        title: "東京 Plan",
        updatedAt: "2026-01-03T04:05:06.000Z",
        focus: true,
        createdAt: "2026-01-02T03:04:05.000Z",
      },
      body: "# Next steps",
    });

    expect(result).toBe(
      "---\ntitle: 東京 Plan\ntags:\n  - work\n  - to do\nfocus: true\ncreatedAt: 2026-01-02T03:04:05.000Z\nupdatedAt: 2026-01-03T04:05:06.000Z\nschemaVersion: 1\n---\n# Next steps"
    );
  });
});
