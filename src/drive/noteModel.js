import { parseMarkdown } from "./markdown.js";

export function normalizeDriveFile(file) {
  if (file?.source === "legacy") {
    return {
      id: file.fileId,
      title: file.title,
      content: file.content,
      tags: file.tags,
      focus: file.focus,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      source: "legacy",
      editable: false,
      warning: null,
    };
  }

  if (file?.mimeType === "application/vnd.google-apps.document") {
    return {
      id: file.fileId,
      title: file.name,
      content: file.markdown ?? "",
      tags: [],
      focus: false,
      createdAt: file.createdTime,
      updatedAt: file.modifiedTime,
      source: "drive-doc",
      editable: false,
      warning: null,
    };
  }

  if (file?.mimeType === "text/plain") {
    return {
      id: file.fileId,
      title: file.name,
      content: file.markdown ?? "",
      tags: [],
      focus: false,
      createdAt: file.createdTime,
      updatedAt: file.modifiedTime,
      source: "drive-text",
      editable: false,
      warning: null,
    };
  }

  const parsed = parseMarkdown(file?.markdown ?? "", { now: file?.createdTime });

  return {
    id: file?.fileId,
    title: parsed.metadata.title,
    content: parsed.body,
    tags: parsed.metadata.tags,
    focus: parsed.metadata.focus,
    createdAt: parsed.metadata.createdAt,
    updatedAt: parsed.metadata.updatedAt,
    source: "drive-markdown",
    editable: true,
    warning: parsed.warning,
  };
}
