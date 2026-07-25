import { ApiError, boundaryError } from "./errors.js";

export async function assertDescendantOfRoot(drive, fileId, rootId, { allowRoot = true } = {}) {
  if (!fileId || !rootId) throw new ApiError("CONFIGURATION", "A Notehub root folder is required", 500);
  if (fileId === rootId) {
    if (allowRoot) return await drive.getFile(fileId);
    throw boundaryError();
  }

  const seen = new Set();
  let currentId = fileId;
  let initial;
  while (currentId) {
    if (seen.has(currentId)) throw boundaryError();
    seen.add(currentId);
    const current = await drive.getFile(currentId);
    if (!current) {
      if (!initial) throw new ApiError("NOT_FOUND", "Drive item was not found", 404);
      throw boundaryError();
    }
    if (!initial) initial = current;
    const parents = Array.isArray(current.parents) ? current.parents : [];
    if (parents.includes(rootId)) return initial;
    if (parents.length !== 1) throw boundaryError();
    currentId = parents[0];
  }
  throw boundaryError();
}
