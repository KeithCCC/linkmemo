import { isUxTestMode } from "../appMode";
import * as liveAuthService from "../supabaseAuth";
import * as dummyAuthService from "./dummyAuthService";

const authService = isUxTestMode ? dummyAuthService : liveAuthService;

export const loginWithGoogle = authService.loginWithGoogle;
export const logout = authService.logout;
export const subscribeToAuth = authService.subscribeToAuth;

