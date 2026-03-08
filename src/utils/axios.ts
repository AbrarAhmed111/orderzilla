import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  clearAuthSession,
  getAuthSession,
  isRefreshInFlight,
  isSessionExpired,
  setAuthSession,
  setRefreshInFlight,
} from "@/lib/auth/session";

export const baseDomain = "/api/proxy";
const OAUTH_CLIENT_ID = "dashboard";
const OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI ??
  "https://dashboard.orderzilla.ch/auth/callback";

export const axiosInstance = axios.create({
  baseURL: baseDomain,
});

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const refreshClient = axios.create({
  baseURL: baseDomain,
});

async function refreshAccessToken() {
  const session = getAuthSession();
  if (!session?.refreshToken) return null;

  const response = await refreshClient.post("/oauth/token", {
    grant_type: "refresh_token",
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    refresh_token: session.refreshToken,
  });

  const token = response.data as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
  };

  if (!token.access_token) return null;

  const nextSession = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? session.refreshToken,
    tokenType: token.token_type ?? "Bearer",
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  };
  setAuthSession(nextSession);
  return nextSession;
}

axiosInstance.interceptors.request.use(async (config) => {
  if (typeof window === "undefined") return config;
  let session = getAuthSession();
  if (!session) return config;

  if (isSessionExpired(session) && session.refreshToken && !isRefreshInFlight()) {
    try {
      setRefreshInFlight(true);
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        session = refreshed;
      } else {
        clearAuthSession();
      }
    } finally {
      setRefreshInFlight(false);
    }
  }

  if (session?.accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    const original = error.config as RetryConfig | undefined;
    if (!original || original._retry || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const current = getAuthSession();
    if (!current?.refreshToken) {
      clearAuthSession();
      return Promise.reject(error);
    }

    try {
      original._retry = true;
      setRefreshInFlight(true);
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        clearAuthSession();
        return Promise.reject(error);
      }
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${refreshed.accessToken}`;
      return axiosInstance.request(original);
    } catch (refreshError) {
      clearAuthSession();
      return Promise.reject(refreshError);
    } finally {
      setRefreshInFlight(false);
    }
  },
);

