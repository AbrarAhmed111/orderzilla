import { NextRequest, NextResponse } from "next/server";

type UserRecord = {
  id?: string;
  name?: string;
  email?: string;
  role?: "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";
  is_active?: boolean;
  created_at?: string;
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

    const response = await fetchProxyJson<{ users?: UserRecord[] }>(request, "/v1/dashboard/users");
    let rows = response.users ?? [];

    if (search) {
      rows = rows.filter((row) => {
        const name = (row.name ?? "").toLowerCase();
        const email = (row.email ?? "").toLowerCase();
        return name.includes(search) || email.includes(search);
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

    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const start = (page - 1) * limit;
    const paged = rows.slice(start, start + limit);

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

