import { getAuthSession } from "@/lib/auth/session";

export type DeleteDashboardUserResult = {
  ok: boolean;
  status: number;
  message: string;
};

/**
 * Delete a dashboard user through the Next.js API route (visible in DevTools as /api/dashboard/users/...).
 * Sends Bearer token from session when present, and cookies (credentials: include) like users-table.
 */
export async function deleteDashboardUser(id: string): Promise<DeleteDashboardUserResult> {
  const trimmed = id.trim();
  if (!trimmed) {
    return { ok: false, status: 400, message: "Missing user id" };
  }

  const headers: Record<string, string> = { accept: "application/json" };
  const session = getAuthSession();
  if (session?.accessToken) {
    headers.authorization = `Bearer ${session.accessToken}`;
  }

  const res = await fetch(`/api/dashboard/users/${encodeURIComponent(trimmed)}`, {
    method: "DELETE",
    credentials: "include",
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let message = "";
  if (text) {
    try {
      const j = JSON.parse(text) as { message?: string; error?: string; detail?: unknown };
      message = String(j.message ?? j.error ?? "").trim();
      if (!message && Array.isArray(j.detail)) {
        message = j.detail.map((d) => (typeof d === "string" ? d : JSON.stringify(d))).join("; ");
      }
    } catch {
      message = text.slice(0, 300).trim();
    }
  }

  return {
    ok: res.ok && res.status >= 200 && res.status < 300,
    status: res.status,
    message,
  };
}

/** Throws on failure so callers can use try/catch like axios. */
export async function deleteDashboardUserOrThrow(id: string): Promise<void> {
  const r = await deleteDashboardUser(id);
  if (!r.ok) {
    const err = new Error(r.message || `Delete failed (${r.status})`) as Error & {
      status?: number;
      isDeleteUserError?: boolean;
    };
    err.status = r.status;
    err.isDeleteUserError = true;
    throw err;
  }
}
