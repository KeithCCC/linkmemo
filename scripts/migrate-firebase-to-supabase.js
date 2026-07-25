import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { readMigrationConfig } from "./migrationConfig.js";

export async function migrateNotes(config = readMigrationConfig()) {
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const firebaseData = JSON.parse(fs.readFileSync(config.firebaseExportPath, "utf-8"));

  if (!Array.isArray(firebaseData)) {
    throw new Error("FIREBASE_EXPORT_PATH must contain a JSON array of notes");
  }

  console.log(`Loading ${firebaseData.length} Firebase notes...`);

  const transformedNotes = firebaseData.map((note) => ({
    user_id: config.userId,
    title: note.title || "Untitled",
    content: note.content || "",
    tags: Array.isArray(note.tags) ? note.tags : [],
    created_at: note.createdAt ? new Date(note.createdAt).toISOString() : new Date().toISOString(),
    updated_at: note.updatedAt ? new Date(note.updatedAt).toISOString() : new Date().toISOString(),
  }));

  const batchSize = 50;
  let inserted = 0;
  let failed = 0;

  for (let index = 0; index < transformedNotes.length; index += batchSize) {
    const batch = transformedNotes.slice(index, index + batchSize);
    const { data, error } = await supabase.from("notes").insert(batch).select();

    if (error) {
      console.error(`Batch ${Math.floor(index / batchSize) + 1} failed:`, error.message);
      failed += batch.length;
    } else {
      inserted += data.length;
      console.log(`Batch ${Math.floor(index / batchSize) + 1}: ${data.length} notes inserted`);
    }
  }

  console.log(`Migration complete: ${inserted} inserted, ${failed} failed.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrateNotes().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
