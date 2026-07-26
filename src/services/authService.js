// Firebase Authentication owns the browser-side Google session. Supabase is not
// imported or contacted by this adapter.
export { loginWithGoogle, logout, subscribeToAuth } from "../auth.js";
