import { describe, expect, test } from "vitest";
import { assertDescendantOfRoot } from "../../api/drive/ancestry.js";

const files = {
  root: { id: "root", parents: [] },
  folder: { id: "folder", parents: ["root"] },
  note: { id: "note", parents: ["folder"] },
  outside: { id: "outside", parents: ["other-root"] },
  cycleA: { id: "cycleA", parents: ["cycleB"] },
  cycleB: { id: "cycleB", parents: ["cycleA"] },
};
const drive = { getFile: async (id) => files[id] ?? null };

describe("Notehub Drive boundary", () => {
  test("accepts an item whose ancestry reaches the stored root", async () => {
    await expect(assertDescendantOfRoot(drive, "note", "root")).resolves.toEqual(files.note);
  });

  test("rejects items outside the stored root and cyclic ancestry", async () => {
    await expect(assertDescendantOfRoot(drive, "outside", "root")).rejects.toMatchObject({ code: "BOUNDARY" });
    await expect(assertDescendantOfRoot(drive, "cycleA", "root")).rejects.toMatchObject({ code: "BOUNDARY" });
  });

  test("does not treat the root itself as a descendant item", async () => {
    await expect(assertDescendantOfRoot(drive, "root", "root", { allowRoot: false })).rejects.toMatchObject({ code: "BOUNDARY" });
  });
});
