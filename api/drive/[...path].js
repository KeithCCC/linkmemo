import { ApiError } from "../../server/drive/errors.js";
import { toErrorResponse } from "../../server/drive/handlers.js";
import { vercelHandler } from "../../server/drive/runtime.js";

const ROUTES = {
  "oauth/start": ["oauthStart", ["GET"]],
  "oauth/callback": ["oauthCallback", ["GET"]],
  connection: ["connection", ["GET", "PATCH"]],
  tree: ["tree", ["GET"]],
  changes: ["changes", ["POST"]],
  "file/create": ["createFile", ["POST"]],
  "file/read": ["readFile", ["GET"]],
  "file/update": ["updateFile", ["PATCH"]],
  "file/move": ["moveFile", ["PATCH"]],
  "file/trash": ["trashFile", ["DELETE"]],
  "folder/create": ["createFolder", ["POST"]],
  "folder/rename": ["renameFolder", ["PATCH"]],
  "folder/move": ["moveFolder", ["PATCH"]],
  "folder/trash": ["trashFolder", ["DELETE"]],
};

function pathFromRequest(request) {
  const value = request.query?.path;
  return (Array.isArray(value) ? value : [value]).filter(Boolean).join("/");
}

export default async function driveHandler(req, res) {
  const route = ROUTES[pathFromRequest(req)];
  if (!route) {
    const error = toErrorResponse(new ApiError("NOT_FOUND", "Drive endpoint was not found", 404));
    return res.status(error.status).json(error.body);
  }
  const [operation, methods] = route;
  return vercelHandler(operation, methods)(req, res);
}
