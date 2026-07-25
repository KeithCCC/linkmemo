import * as dummyAuthService from "./dummyAuthService";

// Authentication is local-only while the Drive connection is being configured.
// Keeping this adapter free of live imports prevents the browser from resolving
// or contacting Supabase.
export const loginWithGoogle = dummyAuthService.loginWithGoogle;
export const logout = dummyAuthService.logout;
export const subscribeToAuth = dummyAuthService.subscribeToAuth;
