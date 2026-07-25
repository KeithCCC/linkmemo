import { describe, expect, test } from "vitest";
import { normalizeDriveFile } from "../../src/drive/noteModel.js";

describe("normalizeDriveFile", () => {
  test("maps a Drive Markdown file to the editable client note shape", () => {
    expect(
      normalizeDriveFile({
        fileId: "drive-file-123",
        name: "Tokyo.md",
        mimeType: "text/markdown",
        markdown:
          "---\ntitle: Tokyo\ntags:\n  - travel\nfocus: true\ncreatedAt: 2026-01-02T03:04:05.000Z\nupdatedAt: 2026-01-03T04:05:06.000Z\n---\n# Shibuya",
      })
    ).toEqual({
      id: "drive-file-123",
      title: "Tokyo",
      content: "# Shibuya",
      tags: ["travel"],
      focus: true,
      createdAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-03T04:05:06.000Z",
      source: "drive-markdown",
      editable: true,
      warning: null,
    });
  });

  test("maps a Google Doc to a non-editable client note", () => {
    expect(
      normalizeDriveFile({
        fileId: "google-doc-456",
        name: "Planning notes",
        mimeType: "application/vnd.google-apps.document",
        createdTime: "2026-03-04T05:06:07.000Z",
        modifiedTime: "2026-03-05T06:07:08.000Z",
      })
    ).toEqual({
      id: "google-doc-456",
      title: "Planning notes",
      content: "",
      tags: [],
      focus: false,
      createdAt: "2026-03-04T05:06:07.000Z",
      updatedAt: "2026-03-05T06:07:08.000Z",
      source: "drive-doc",
      editable: false,
      warning: null,
    });
  });

  test("preserves exported Google Doc Markdown while keeping it read-only", () => {
    expect(normalizeDriveFile({ fileId: "doc", name: "Doc", mimeType: "application/vnd.google-apps.document", markdown: "# Exported\nSearch me", createdTime: "2026-01-01T00:00:00.000Z", modifiedTime: "2026-01-02T00:00:00.000Z" })).toEqual(expect.objectContaining({ content: "# Exported\nSearch me", source: "drive-doc", editable: false }));
  });

  test("preserves plain text as a non-editable Drive text note", () => {
    expect(normalizeDriveFile({ fileId: "text", name: "Readme.txt", mimeType: "text/plain", markdown: "plain text", createdTime: "2026-01-01T00:00:00.000Z" })).toEqual(expect.objectContaining({ title: "Readme.txt", content: "plain text", source: "drive-text", editable: false }));
  });

  test("marks legacy records as non-editable while retaining their client fields", () => {
    expect(
      normalizeDriveFile({
        fileId: "legacy-789",
        source: "legacy",
        title: "Imported archive",
        content: "Old note body",
        tags: ["archive"],
        focus: true,
        createdAt: "2025-12-01T01:02:03.000Z",
        updatedAt: "2025-12-02T02:03:04.000Z",
      })
    ).toEqual({
      id: "legacy-789",
      title: "Imported archive",
      content: "Old note body",
      tags: ["archive"],
      focus: true,
      createdAt: "2025-12-01T01:02:03.000Z",
      updatedAt: "2025-12-02T02:03:04.000Z",
      source: "legacy",
      editable: false,
      warning: null,
    });
  });
});
