import { ApiError } from "./errors.js";

export async function authenticateRequest(request, auth, { allowedEmail } = {}) {
  const value = request?.headers?.authorization ?? request?.headers?.Authorization;
  const match = typeof value === "string" && value.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError("AUTH", "A valid Supabase bearer token is required", 401);
  const user = await auth.verify(match[1]);
  if (!user?.id) throw new ApiError("AUTH", "A valid Supabase bearer token is required", 401);
  if (allowedEmail && user.email?.toLowerCase() !== allowedEmail.toLowerCase()) {
    throw new ApiError("AUTH", "This account is not permitted to use Google Drive", 403);
  }
  return user;
}
