export function getEditBasePath() {
  if (typeof window === "undefined") return "/edit";
  const path = window.location.pathname || "";
  const marker = "/edit/";
  const editIndex = path.indexOf(marker);

  if (editIndex >= 0) {
    return `${path.slice(0, editIndex)}/edit` || "/edit";
  }

  if (path === "/edit") return "/edit";
  return "/edit";
}

export function buildEditHref(noteId, { preserveSearch = true } = {}) {
  const id = encodeURIComponent(String(noteId));
  const search = preserveSearch && typeof window !== "undefined" ? window.location.search || "" : "";
  return `${getEditBasePath()}/${id}${search}`;
}
