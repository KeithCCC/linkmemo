import { describe, expect, test } from "vitest";
import { readMigrationConfig } from "../../scripts/migrationConfig.js";

describe("readMigrationConfig", () => {
  test("rejects a migration configuration that omits required secrets and identifiers", () => {
    expect(() => readMigrationConfig({})).toThrow(
      "Missing required migration environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_MIGRATION_USER_ID, FIREBASE_EXPORT_PATH"
    );
  });

  test("returns required migration settings only from the supplied environment", () => {
    expect(
      readMigrationConfig({
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_MIGRATION_USER_ID: "user-123",
        FIREBASE_EXPORT_PATH: "exports/notes.json",
      })
    ).toEqual({
      supabaseUrl: "https://project.supabase.co",
      supabaseServiceRoleKey: "service-role-key",
      userId: "user-123",
      firebaseExportPath: "exports/notes.json",
    });
  });
});
