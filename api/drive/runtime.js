import { createDriveApplication } from "./application.js";
import { GoogleDriveTransport } from "./googleDriveTransport.js";
import { GoogleTokenTransport } from "./googleTokens.js";
import { SupabaseTransport } from "./supabaseTransport.js";

function requestFromVercel(req) {
  return { method: req.method, headers: req.headers ?? {}, query: req.query ?? {}, body: req.body ?? {} };
}

function send(res, response) {
  for (const [name, value] of Object.entries(response.headers ?? {})) res.setHeader(name, value);
  if (response.body === null) return res.status(response.status).end();
  return res.status(response.status).json(response.body);
}

export function createRuntime({ env = process.env, fetch = globalThis.fetch } = {}) {
  const supabase = new SupabaseTransport({ env, fetch });
  const tokens = new GoogleTokenTransport({ fetch });
  return createDriveApplication({ env, auth: supabase, connections: supabase, tokens, driveFactory: (accessToken) => new GoogleDriveTransport({ accessToken, fetch }) });
}

export function vercelHandler(operation, dependencies) {
  return async (req, res) => send(res, await createRuntime(dependencies)[operation](requestFromVercel(req)));
}
