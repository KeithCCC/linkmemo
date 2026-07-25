import { createDriveApplication } from "./application.js";
import { GoogleDriveTransport } from "./googleDriveTransport.js";
import { GoogleTokenTransport } from "./googleTokens.js";
import { SupabaseTransport } from "./supabaseTransport.js";
import { ApiError } from "./errors.js";
import { toErrorResponse } from "./handlers.js";

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

export function vercelHandler(operation, methods, dependencies) {
  return async (req, res) => {
    const allowed = Array.isArray(methods) ? methods : [];
    if (!allowed.includes(req.method)) {
      return send(res, { ...toErrorResponse(new ApiError("METHOD_NOT_ALLOWED", "HTTP method is not allowed for this endpoint", 405)), headers: { allow: allowed.join(", ") } });
    }
    try {
      return send(res, await createRuntime(dependencies)[operation](requestFromVercel(req)));
    } catch (error) {
      return send(res, toErrorResponse(error));
    }
  };
}
