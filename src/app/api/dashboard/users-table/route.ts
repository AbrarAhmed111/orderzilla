import { NextRequest, NextResponse } from "next/server";

type UserRecord = {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";
  is_active?: boolean;
  created_at?: string;
  location_ids?: string[];
  location_names?: string[];
  can_manage_products?: boolean;
  can_manage_loyalty?: boolean;
};

function toPositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

async function fetchProxyJson<T>(request: NextRequest, path: string): Promise<T> {
  const url = `${request.nextUrl.origin}/api/proxy${path}`;
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
    const limit = toPositiveInt(sp.get("limit"), 20);
    const search = (sp.get("search") ?? "").trim().toLowerCase();
    const role = (sp.get("role") ?? "all").toLowerCase();
    const status = (sp.get("status") ?? "all").toLowerCase();

    const useFilters = search !== "" || role !== "all" || status !== "all";
    const path = useFilters
      ? `/v1/dashboard/users?page=1&limit=500`
      : `/v1/dashboard/users?page=${page}&limit=${limit}`;
    const response = await fetchProxyJson<{
      users?: UserRecord[];
      pagination?: {
        current_page?: number;
        total_pages?: number;
        total_items?: number;
        items_per_page?: number;
      };
    }>(request, path);
    let rows = (response.users ?? []).map((row) => ({
      ...row,
      name: row.name ?? (`${(row.first_name ?? "").trim()} ${(row.last_name ?? "").trim()}`.trim() || "Unnamed user"),
    }));

    if (search) {
      rows = rows.filter((row) => {
        const name =
          (row.name ?? `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() ?? "").toLowerCase();
        const email = (row.email ?? "").toLowerCase();
        const phone = (row.phone ?? "").toLowerCase();
        return name.includes(search) || email.includes(search) || phone.includes(search);
      });
    }

    if (role !== "all") {
      rows = rows.filter((row) => (row.role ?? "").toLowerCase() === role);
    }

    if (status !== "all") {
      rows = rows.filter((row) => {
        const isActive = row.is_active ?? true;
        return status === "active" ? isActive : !isActive;
      });
    }

    const useBackendPagination =
      search === "" && role === "all" && status === "all" && response.pagination;
    const totalItems = useBackendPagination
      ? (response.pagination?.total_items ?? rows.length)
      : rows.length;
    const totalPages = useBackendPagination
      ? Math.max(1, response.pagination?.total_pages ?? 1)
      : Math.max(1, Math.ceil(totalItems / limit));
    const start = useBackendPagination ? 0 : (page - 1) * limit;
    const paged = useBackendPagination ? rows : rows.slice(start, start + limit);

    return NextResponse.json({
      users: paged,
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
        message: "Failed to build users table data",
        error: (error as { message?: string })?.message ?? "Unknown error",
      },
      { status: 500 },
    );
  }
}

