export const APP_MODE = import.meta.env.VITE_APP_MODE || "live";

export const isUxTestMode = APP_MODE === "ux_test";

