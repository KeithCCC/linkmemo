export class ApiError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const boundaryError = () => new ApiError("BOUNDARY", "The requested item is outside the Notehub folder", 403);
