import { supabase } from "./supabase";

const mapSupabaseUser = (user) => {
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.email,
    ...user,
  };
};

export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error("Google sign-in failed.", error);
    throw error;
  }

  return data;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign-out failed.", error);
    throw error;
  }
};

export const subscribeToAuth = (callback) => {
  let active = true;

  const safeCallback = (user) => {
    if (!active) return;
    callback(mapSupabaseUser(user));
  };

  const bootstrapSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Auth session bootstrap failed.", error);
        safeCallback(null);
        return;
      }
      safeCallback(data?.session?.user ?? null);
    } catch (error) {
      console.error("Auth session bootstrap crashed.", error);
      safeCallback(null);
    }
  };

  bootstrapSession();

  let subscription = null;
  try {
    const result = supabase.auth.onAuthStateChange((_event, session) => {
      safeCallback(session?.user ?? null);
    });
    subscription = result?.data?.subscription ?? null;
  } catch (error) {
    console.error("Auth state subscription failed.", error);
    safeCallback(null);
  }

  return () => {
    active = false;
    subscription?.unsubscribe?.();
  };
};
