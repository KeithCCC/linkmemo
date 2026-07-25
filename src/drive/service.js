import { supabase } from "../supabase.js";
import { DriveBffClient } from "./client.js";
import { notehubRepository } from "./repository.js";
import { NotehubSyncEngine } from "./syncEngine.js";

export async function getSupabaseAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.access_token ?? null;
}

export function createNotehubDriveService({ repository = notehubRepository, client = new DriveBffClient({ getAccessToken: getSupabaseAccessToken }) } = {}) {
  return new NotehubSyncEngine({ repository, client });
}

export const notehubDriveService = createNotehubDriveService();
