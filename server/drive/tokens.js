import { decryptRefreshToken, encryptRefreshToken } from "./crypto.js";
import { ApiError } from "./errors.js";

export async function refreshAccessToken({ connection, encryptionKey, tokens, connections }) {
  if (!connection?.encryptedRefreshToken) throw new ApiError("NOT_FOUND", "Google Drive is not connected", 404);
  const refreshToken = decryptRefreshToken(connection.encryptedRefreshToken, encryptionKey);
  const result = await tokens.refresh(refreshToken);
  if (!result?.access_token) throw new ApiError("UPSTREAM", "Google did not return an access token", 502);
  if (result.refresh_token) await connections.updateRefreshToken(encryptRefreshToken(result.refresh_token, encryptionKey));
  return result.access_token;
}
