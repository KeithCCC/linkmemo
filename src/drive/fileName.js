const UNSAFE_FILE_NAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001F]+/g;

export function generateMarkdownFileName(title, siblingNames = []) {
  const readableTitle = String(title ?? "")
    .normalize("NFKC")
    .replace(/\.md$/i, "")
    .replace(UNSAFE_FILE_NAME_CHARACTERS, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  const baseName = readableTitle || "Untitled";
  const siblingNameSet = new Set(Array.from(siblingNames, (name) => String(name).toLocaleLowerCase()));
  let suffix = 1;
  let candidate = `${baseName}.md`;

  while (siblingNameSet.has(candidate.toLocaleLowerCase())) {
    suffix += 1;
    candidate = `${baseName}-${suffix}.md`;
  }

  return candidate;
}
