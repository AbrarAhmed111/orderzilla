import { NextRequest, NextResponse } from "next/server";

type LocationRecord = {
  id?: string;
  name?: string;
  address?: string | null;
  zip?: string | null;
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
  const qs = query?.toString();
  const url = `${request.nextUrl.origin}/api/proxy${path}${qs ? `?${qs}` : ""}`;
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

type LocationsResponse = {
  locations?: LocationRecord[];
  pagination?: {
    current_page?: number;
    total_pages?: number;
    total_items?: number;
    items_per_page?: number;
  };
};

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const page = toPositiveInt(sp.get("page"), 1);
    const limit = toPositiveInt(sp.get("limit"), 10);
    const status = sp.get("status") ?? "all";
    const search = (sp.get("search") ?? "").trim().toLowerCase();

    const useFilters = status !== "all" || search !== "";
    const query = new URLSearchParams();
    if (useFilters) {
      query.set("page", "1");
      query.set("limit", "500");
    } else {
      query.set("page", String(page));
      query.set("limit", String(limit));
    }

    const response = await fetchProxyJson<LocationsResponse>(
      request,
      "/v1/dashboard/locations",
      query,
    );
    let rows = response.locations ?? [];

    if (status === "active") rows = rows.filter((location) => location.is_active);
    if (status === "maintenance") rows = rows.filter((location) => !location.is_active);

    if (search) {
      rows = rows.filter((location) => {
        const name = (location.name ?? "").toLowerCase();
        const city = (location.city ?? "").toLowerCase();
        const country = (location.country ?? "").toLowerCase();
        const zip = (location.zip ?? "").toLowerCase();
        return name.includes(search) || city.includes(search) || country.includes(search) || zip.includes(search);
      });
    }

    const useBackendPagination = !useFilters && response.pagination;
    const totalItems = useBackendPagination
      ? (response.pagination?.total_items ?? rows.length)
      : rows.length;
    const totalPages = useBackendPagination
      ? Math.max(1, response.pagination?.total_pages ?? 1)
      : Math.max(1, Math.ceil(totalItems / limit));
    const start = useBackendPagination ? 0 : (page - 1) * limit;
    const paged = useBackendPagination ? rows : rows.slice(start, start + limit);

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

