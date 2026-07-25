const REQUIRED_MIGRATION_VARIABLES = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_MIGRATION_USER_ID",
  "FIREBASE_EXPORT_PATH",
];

export function readMigrationConfig(environment = process.env) {
  const missing = REQUIRED_MIGRATION_VARIABLES.filter((name) => !environment[name]?.trim());

  if (missing.length > 0) {
    throw new Error(`Missing required migration environment variables: ${missing.join(", ")}`);
  }

  return {
    supabaseUrl: environment.SUPABASE_URL,
    supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY,
    userId: environment.SUPABASE_MIGRATION_USER_ID,
    firebaseExportPath: environment.FIREBASE_EXPORT_PATH,
  };
}
