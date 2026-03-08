import { NextRequest, NextResponse } from "next/server";

type LocationRecord = {
  id?: string;
  name?: string;
  address?: string | null;
  city?: string | null;
  country?: string;
  timezone?: string;
  is_active?: boolean;
  terminal_count?: number;
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
    const status = sp.get("status") ?? "all";
    const search = (sp.get("search") ?? "").trim().toLowerCase();

    const response = await fetchProxyJson<{ locations?: LocationRecord[] }>(
      request,
      "/v1/dashboard/locations",
    );
    let rows = response.locations ?? [];

    if (status === "active") rows = rows.filter((location) => location.is_active);
    if (status === "maintenance") rows = rows.filter((location) => !location.is_active);

    if (search) {
      rows = rows.filter((location) => {
        const name = (location.name ?? "").toLowerCase();
        const city = (location.city ?? "").toLowerCase();
        const country = (location.country ?? "").toLowerCase();
        return name.includes(search) || city.includes(search) || country.includes(search);
      });
    }

    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const start = (page - 1) * limit;
    const paged = rows.slice(start, start + limit);

    return NextResponse.json({
      locations: paged,
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
        message: "Failed to build locations table data",
        error: (error as { message?: string })?.message ?? "Unknown error",
      },
      { status: 500 },
    );
  }
}

