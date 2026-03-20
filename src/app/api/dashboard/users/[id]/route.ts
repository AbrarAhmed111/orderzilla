import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Browser DELETE to upstream via proxy — same auth pattern as GET /api/dashboard/users-table
 * (cookie `oz_access_token` and/or Authorization on the incoming request).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const trimmed = id?.trim();
  if (!trimmed) {
    return NextResponse.json({ message: "Missing user id" }, { status: 400 });
  }

  const encoded = encodeURIComponent(trimmed);
  const target = `${request.nextUrl.origin}/api/proxy/v1/dashboard/users/${encoded}`;

  const cookieToken = request.cookies.get("oz_access_token")?.value;
  const authHeader =
    request.headers.get("authorization") ??
    (cookieToken ? `Bearer ${cookieToken}` : "");

  if (!authHeader) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const upstream = await fetch(target, {
    method: "DELETE",
    headers: {
      authorization: authHeader,
      accept: "application/json",
      "accept-language": request.headers.get("accept-language") ?? "en",
    },
    cache: "no-store",
  });

  const contentType = upstream.headers.get("content-type") ?? "";
  const body = await upstream.arrayBuffer();

  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);

  return new NextResponse(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
