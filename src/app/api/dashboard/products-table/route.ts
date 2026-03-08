import { NextRequest, NextResponse } from "next/server";

type ProductRecord = {
  id?: string;
  name?: string;
  sku?: string | null;
  category_id?: string;
  category_name?: string;
  base_price?: string | null;
  tax_rate?: number;
  is_active?: boolean;
};

function toInt(value: string | null, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback;
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
    const page = toInt(sp.get("page"), 1);
    const limit = toInt(sp.get("limit"), 20);
    const categoryId = sp.get("category_id") ?? "";
    const status = sp.get("status") ?? "all";
    const locationId = sp.get("location_id") ?? "";
    const search = (sp.get("search") ?? "").trim().toLowerCase();
    const priceRange = sp.get("price_range") ?? "all";
    const availability = sp.get("availability") ?? "all";

    const productQuery = new URLSearchParams();
    if (categoryId && categoryId !== "all") productQuery.set("category_id", categoryId);
    if (status === "active") productQuery.set("active_only", "true");

    const productResp = await fetchProxyJson<{ products?: ProductRecord[] }>(
      request,
      "/v1/dashboard/products",
      productQuery,
    );
    let products = productResp.products ?? [];

    if (status === "inactive") {
      products = products.filter((product) => !product.is_active);
    }

    if (locationId && locationId !== "all") {
      const terminalResp = await fetchProxyJson<{ terminals?: Array<{ id?: string }> }>(
        request,
        "/v1/dashboard/terminals",
        new URLSearchParams({ location_id: locationId }),
      );
      const terminalIds = (terminalResp.terminals ?? [])
        .map((terminal) => terminal.id)
        .filter((id): id is string => Boolean(id));

      if (terminalIds.length === 0) {
        products = [];
      } else {
        const overrideResponses = await Promise.all(
          terminalIds.map((terminalId) =>
            fetchProxyJson<{ products?: Array<{ id?: string }> }>(
              request,
              `/v1/dashboard/terminals/${terminalId}/products`,
            ),
          ),
        );
        const visibleProductIds = new Set<string>();
        overrideResponses.forEach((resp) => {
          (resp.products ?? []).forEach((product) => {
            if (product.id) visibleProductIds.add(product.id);
          });
        });
        products = products.filter((product) => (product.id ? visibleProductIds.has(product.id) : false));
      }
    }

    if (search) {
      products = products.filter((product) => {
        const name = (product.name ?? "").toLowerCase();
        const sku = (product.sku ?? "").toLowerCase();
        return name.includes(search) || sku.includes(search);
      });
    }

    const getPrice = (raw: string | null | undefined) => {
      if (!raw) return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    };

    if (availability === "with_price") {
      products = products.filter((product) => getPrice(product.base_price) !== null);
    } else if (availability === "no_price") {
      products = products.filter((product) => getPrice(product.base_price) === null);
    }

    if (priceRange !== "all") {
      products = products.filter((product) => {
        const price = getPrice(product.base_price);
        if (price === null) return false;
        if (priceRange === "0-10") return price >= 0 && price <= 10;
        if (priceRange === "10-20") return price > 10 && price <= 20;
        if (priceRange === "20-50") return price > 20 && price <= 50;
        if (priceRange === "50+") return price > 50;
        return true;
      });
    }

    const totalItems = products.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const start = (page - 1) * limit;
    const paged = products.slice(start, start + limit);

    return NextResponse.json({
      products: paged,
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
        message: "Failed to build products table data",
        error: (error as { message?: string })?.message ?? "Unknown error",
      },
      { status: 500 },
    );
  }
}

