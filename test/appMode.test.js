import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { APP_MODE, isLocalOnlyMode } from "../src/appMode.js";

describe("application mode", () => {
  test("defaults to local-only mode so the browser does not require Supabase", () => {
    expect(APP_MODE).toBe("local");
    expect(isLocalOnlyMode).toBe(true);
  });

  test("keeps Supabase clients outside the browser entry services", () => {
    for (const path of [
      "src/services/authService.js",
      "src/services/notesService.js",
      "src/context/NotesContext.jsx",
    ]) {
      const source = readFileSync(resolve(process.cwd(), path), "utf8");
      for (const forbiddenModule of ["../supabase", "../supabaseAuth", "../drive/service", "./legacyNotesService"]) {
        expect(source).not.toContain(forbiddenModule);
      }
    }
  });

  test("uses the Firebase Google authentication adapter instead of the test user", () => {
    const source = readFileSync(resolve(process.cwd(), "src/services/authService.js"), "utf8");
    expect(source).toContain('from "../auth.js"');
    expect(source).not.toContain("dummyAuthService");
  });

  test("normalizes Firebase configuration values before creating the auth client", () => {
    const source = readFileSync(resolve(process.cwd(), "src/firebase.js"), "utf8");
    expect(source).toContain("value.trim()");
  });
});
