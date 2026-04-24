const STORAGE_KEY = "uxTest.auth.signedIn";

const listeners = new Set();

const dummyUser = {
  uid: "ux-test-user",
  email: "ux-test@example.com",
  displayName: "UX Test User",
};

const readSignedIn = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY, "true");
      return true;
    }
    return raw === "true";
  } catch {
    return true;
  }
};

const emit = () => {
  const user = readSignedIn() ? dummyUser : null;
  listeners.forEach((listener) => listener(user));
};

export const loginWithGoogle = async () => {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {}
  emit();
  return { user: dummyUser };
};

export const logout = async () => {
  try {
    localStorage.setItem(STORAGE_KEY, "false");
  } catch {}
  emit();
};

export const subscribeToAuth = (callback) => {
  listeners.add(callback);
  callback(readSignedIn() ? dummyUser : null);

  const onStorage = (event) => {
    if (event.key === STORAGE_KEY) {
      callback(readSignedIn() ? dummyUser : null);
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
};

