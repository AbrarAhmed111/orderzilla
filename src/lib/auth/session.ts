export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt: number;
};

const ACCESS_COOKIE = "oz_access_token";
const SESSION_KEY = "oz_auth_session";
const REFRESH_LOCK_KEY = "oz_refresh_inflight";

function isBrowser() {
  return typeof window !== "undefined";
}

export function setAuthSession(session: AuthSession) {
  if (!isBrowser()) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  const maxAge = Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1000));
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(session.accessToken)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function getAuthSession(): AuthSession | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REFRESH_LOCK_KEY);
  document.cookie = `${ACCESS_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function isSessionExpired(session: AuthSession, bufferMs = 10_000) {
  return Date.now() + bufferMs >= session.expiresAt;
}

export function setRefreshInFlight(value: boolean) {
  if (!isBrowser()) return;
  if (value) {
    localStorage.setItem(REFRESH_LOCK_KEY, "1");
  } else {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  }
}

export function isRefreshInFlight() {
  if (!isBrowser()) return false;
  return localStorage.getItem(REFRESH_LOCK_KEY) === "1";
}

