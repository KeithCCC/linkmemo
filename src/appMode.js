// The web app is intentionally local-first until Drive authentication is enabled
// through the server-side BFF.  Do not make Supabase a browser dependency.
export const APP_MODE = import.meta.env.VITE_APP_MODE || "local";

export const isUxTestMode = APP_MODE === "ux_test";
export const isLocalOnlyMode = APP_MODE === "local" || isUxTestMode;
