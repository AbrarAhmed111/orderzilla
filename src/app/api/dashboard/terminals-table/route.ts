import { NextRequest, NextResponse } from "next/server";

type TerminalRecord = {
  id?: string;
  terminal_code?: string;
  name?: string;
  mode?: "INDOOR" | "TAKEAWAY";
  status?: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "ERROR";
  last_heartbeat_at?: string | null;
  app_version?: string | null;
  is_active?: boolean;
  location_id?: string;
  location_name?: string;
};

function toPositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

async function fetchProxyJson<T>(
  request: NextRequest,
  path: string,
  query?: URLSearchParams,
): Promise<T> {
  const url = `${request.nextUrl.origin}/api/proxy${path}${query ? `?${query.toString()}` : ""}`;
  const cookieToken = request.cookies.get("oz_access_token")?.value;
  const authHeader =
    request.headers.get("authorization") ??
    (cookieToken ? `Bearer ${cookieToken}` : "");
  const response = await fetch(url, {
    method: "GET",
    headers: {
      authorization: authHeader,
      "accept-language": request.headers.get("accept-language") ?? "en",
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Upstream failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const page = toPositiveInt(sp.get("page"), 1);
    const limit = toPositiveInt(sp.get("limit"), 10);
    const locationId = sp.get("location_id") ?? "";
    const mode = sp.get("mode") ?? "all";
    const status = sp.get("status") ?? "all";
    const search = (sp.get("search") ?? "").trim().toLowerCase();

    const upstreamQuery = new URLSearchParams();
    if (locationId && locationId !== "all") upstreamQuery.set("location_id", locationId);

    const response = await fetchProxyJson<{ terminals?: TerminalRecord[] }>(
      request,
      "/v1/dashboard/terminals",
      upstreamQuery,
    );

    let rows = response.terminals ?? [];
    if (mode !== "all") rows = rows.filter((row) => (row.mode ?? "").toLowerCase() === mode);
    if (status !== "all") rows = rows.filter((row) => (row.status ?? "").toLowerCase() === status);
    if (search) {
      rows = rows.filter((row) => {
        const name = (row.name ?? "").toLowerCase();
        const code = (row.terminal_code ?? "").toLowerCase();
        const location = (row.location_name ?? "").toLowerCase();
        return name.includes(search) || code.includes(search) || location.includes(search);
      });
    }

    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const start = (page - 1) * limit;
    const paged = rows.slice(start, start + limit);

    return NextResponse.json({
      terminals: paged,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalItems,
        items_per_page: limit,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to build terminals table data",
        error: (error as { message?: string })?.message ?? "Unknown error",
      },
      { status: 500 },
    );
  }
}

