import { authenticateRequest } from "./auth.js";
import { ApiError } from "./errors.js";
import { createOAuthHandlers, toErrorResponse } from "./handlers.js";
import { DriveService } from "./service.js";
import { refreshAccessToken } from "./tokens.js";

function requireValue(value, message) {
  if (!value) throw new ApiError("NOT_FOUND", message, 404);
  return value;
}

export function createDriveApplication({ env, auth, connections, tokens, driveFactory }) {
  const scopedConnections = (userId) => ({
    upsert: (value) => connections.upsert(value),
    updateRefreshToken: (value) => connections.updateRefreshToken(userId, value),
    updatePageToken: (value) => connections.updatePageToken(userId, value),
    updateFolder: (value) => connections.updateFolder(userId, value),
  });
  const oauth = createOAuthHandlers({ env, auth, tokens, connections: { upsert: (data) => connections.upsert(data) } });

  async function authenticated(request, action) {
    try {
      const user = await authenticateRequest(request, auth, { allowedEmail: env.DRIVE_ALLOWED_EMAIL });
      return await action(user);
    } catch (error) {
      return toErrorResponse(error);
    }
  }

  async function serviceFor(userId) {
    const connection = requireValue(await connections.get(userId), "Google Drive is not connected");
    const rootId = requireValue(connection.folder_id ?? connection.folderId, "A Notehub folder has not been selected");
    const accessToken = await refreshAccessToken({
      connection: { encryptedRefreshToken: connection.encrypted_refresh_token ?? connection.encryptedRefreshToken },
      encryptionKey: env.DRIVE_TOKEN_ENCRYPTION_KEY,
      tokens: { refresh: (refreshToken) => tokens.refresh(refreshToken, { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }) },
      connections: scopedConnections(userId),
    });
    return { service: new DriveService({ drive: driveFactory(accessToken), rootId }), connection };
  }

  function data(status, body) { return { status, body }; }

  return {
    oauthStart: oauth.start,
    oauthCallback: oauth.callback,
    connection: (request) => authenticated(request, async (user) => {
      const connection = await connections.get(user.id);
      if (request.method === "GET") return data(200, connection ? { connected: true, folderId: connection.folder_id ?? connection.folderId ?? null, grantedScope: connection.granted_scope ?? connection.grantedScope ?? null } : { connected: false, folderId: null, grantedScope: null });
      const folderId = request.body?.folderId;
      if (!folderId) throw new ApiError("CONFIGURATION", "folderId is required", 400);
      const current = requireValue(connection, "Google Drive is not connected");
      const accessToken = await refreshAccessToken({ connection: { encryptedRefreshToken: current.encrypted_refresh_token ?? current.encryptedRefreshToken }, encryptionKey: env.DRIVE_TOKEN_ENCRYPTION_KEY, tokens: { refresh: (value) => tokens.refresh(value, { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }) }, connections: scopedConnections(user.id) });
      const drive = driveFactory(accessToken);
      const folder = await drive.getFile(folderId);
      if (!folder || folder.mimeType !== "application/vnd.google-apps.folder") throw new ApiError("NOT_FOUND", "Selected Notehub folder was not found", 404);
      await scopedConnections(user.id).updateFolder(folderId);
      return data(200, { connected: true, folderId });
    }),
    tree: (request) => authenticated(request, async (user) => { const { service } = await serviceFor(user.id); return data(200, { items: await service.tree() }); }),
    changes: (request) => authenticated(request, async (user) => { const { service, connection } = await serviceFor(user.id); return data(200, await service.changes({ pageToken: connection.change_page_token ?? connection.changePageToken, knownIds: request.body?.knownIds ?? [], persistPageToken: scopedConnections(user.id).updatePageToken })); }),
    readFile: (request) => authenticated(request, async (user) => { const { service } = await serviceFor(user.id); return data(200, await service.read(request.query?.id)); }),
    createFile: (request) => authenticated(request, async (user) => { const { service } = await serviceFor(user.id); return data(201, await service.createFile(request.body ?? {})); }),
    updateFile: (request) => authenticated(request, async (user) => { const { service } = await serviceFor(user.id); return data(200, await service.updateFile(request.query?.id, request.body ?? {})); }),
    moveFile: (request) => authenticated(request, async (user) => { const { service } = await serviceFor(user.id); return data(200, await service.moveFile(request.query?.id, request.body?.parentId)); }),
    trashFile: (request) => authenticated(request, async (user) => { const { service } = await serviceFor(user.id); return data(200, await service.trashFile(request.query?.id)); }),
    createFolder: (request) => authenticated(request, async (user) => { const { service } = await serviceFor(user.id); return data(201, await service.createFolder(request.body ?? {})); }),
    renameFolder: (request) => authenticated(request, async (user) => { const { service } = await serviceFor(user.id); return data(200, await service.renameFolder(request.query?.id, request.body?.name)); }),
    moveFolder: (request) => authenticated(request, async (user) => { const { service } = await serviceFor(user.id); return data(200, await service.moveFolder(request.query?.id, request.body?.parentId)); }),
  };
}
