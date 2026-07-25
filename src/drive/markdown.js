import YAML from "yaml";

export const FRONT_MATTER_SCHEMA_VERSION = 1;

const FRONT_MATTER_PATTERN = /^---[\t ]*\r?\n(?:([\s\S]*?)\r?\n)?---[\t ]*(?:\r?\n|$)/;

function toIsoString(value) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

export function normalizeMetadata(metadata, { now = new Date().toISOString() } = {}) {
  const source = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};

  return {
    title: typeof source.title === "string" && source.title.trim() ? source.title.trim() : "Untitled",
    tags: Array.isArray(source.tags) ? source.tags : [],
    focus: source.focus === true,
    createdAt: toIsoString(source.createdAt) ?? now,
    updatedAt: toIsoString(source.updatedAt) ?? now,
    schemaVersion: FRONT_MATTER_SCHEMA_VERSION,
  };
}

export function parseMarkdown(markdown, options) {
  const source = typeof markdown === "string" ? markdown : "";
  const match = source.match(FRONT_MATTER_PATTERN);

  if (!match) {
    return {
      metadata: normalizeMetadata({}, options),
      body: source,
      warning: /^---[\t ]*\r?\n/.test(source) ? "Unable to parse YAML front matter" : null,
    };
  }

  try {
    const parsed = YAML.parse(match[1] ?? "");
    if (parsed !== null && (typeof parsed !== "object" || Array.isArray(parsed))) {
      throw new Error("Front matter must be a mapping");
    }

    return {
      metadata: normalizeMetadata(parsed, options),
      body: source.slice(match[0].length),
      warning: null,
    };
  } catch (error) {
    return {
      metadata: normalizeMetadata({}, options),
      body: source,
      warning: "Unable to parse YAML front matter",
    };
  }
}

export function serializeMarkdown({ metadata = {}, body = "" } = {}, options) {
  const normalized = normalizeMetadata(metadata, options);
  const orderedMetadata = {
    title: normalized.title,
    tags: normalized.tags,
    focus: normalized.focus,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    schemaVersion: FRONT_MATTER_SCHEMA_VERSION,
  };

  return `---\n${YAML.stringify(orderedMetadata)}---\n${typeof body === "string" ? body : ""}`;
}
