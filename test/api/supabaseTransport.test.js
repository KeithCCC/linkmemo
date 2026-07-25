import { describe, expect, test } from "vitest";
import { SupabaseTransport } from "../../server/drive/supabaseTransport.js";

const env = { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service-key" };

describe("Supabase Drive connection persistence", () => {
  test("clears the selected root and cursor whenever OAuth credentials are replaced", async () => {
    const requests = [];
    const transport = new SupabaseTransport({ env, fetch: async (url, options) => { requests.push([url, options]); return new Response("", { status: 201 }); } });

    await transport.upsert({ userId: "user", encryptedRefreshToken: "encrypted", grantedScope: "scope" });
    expect(JSON.parse(requests[0][1].body)).toMatchObject({ folder_id: null, change_page_token: null });
  });

  test("clears stale change pages when the selected Notehub root changes", async () => {
    const requests = [];
    const transport = new SupabaseTransport({ env, fetch: async (url, options) => { requests.push([url, options]); return new Response(null, { status: 204 }); } });

    await transport.updateFolder("user", "new-root");
    expect(JSON.parse(requests[0][1].body)).toEqual({ folder_id: "new-root", change_page_token: null });
  });
});
