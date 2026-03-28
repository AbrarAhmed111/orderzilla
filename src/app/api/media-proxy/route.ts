import { NextRequest, NextResponse } from "next/server";

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "metadata.google.internal" || h === "metadata.goog") return true;
  if (h === "169.254.169.254") return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = ipv4.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; /* CGNAT */
  }
  return false;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw?.trim()) {
    return NextResponse.json({ message: "Missing url query parameter" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ message: "Invalid URL" }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ message: "Only http(s) URLs are allowed" }, { status: 400 });
  }

  if (isBlockedHostname(target.hostname)) {
    return NextResponse.json({ message: "Host not allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(target.toString(), {
      redirect: "follow",
      headers: { Accept: "image/*,*/*;q=0.8" },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Failed to fetch image" },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
      );
    }

    const buf = await res.arrayBuffer();
    const upstreamType = res.headers.get("content-type");
    const ct =
      upstreamType?.split(";")[0].trim() ||
      (buf.byteLength > 0 ? "image/jpeg" : "application/octet-stream");

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ message: "Image fetch failed" }, { status: 502 });
  }
}
