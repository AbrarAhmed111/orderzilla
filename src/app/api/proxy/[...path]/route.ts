import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import https from "https";

const API_BASE_URL =
  process.env.ORDERZILLA_API_BASE ?? "https://orderzilla-api.tappy-app.ch";
const ALLOW_INSECURE_TLS = process.env.ORDERZILLA_ALLOW_INSECURE_TLS === "true";
const HTTPS_AGENT = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: !ALLOW_INSECURE_TLS,
});

const upstreamClient = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  timeout: 30000,
  validateStatus: () => true,
  responseType: "arraybuffer",
  httpsAgent: HTTPS_AGENT,
});

type ProxyContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function handleProxy(request: NextRequest, context: ProxyContext) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "ORDERZILLA_API_BASE is not configured" },
      { status: 500 },
    );
  }

  const params = await context.params;
  const pathSegments = params.path ?? [];
  const path = pathSegments.join("/");

  const search = request.nextUrl.search;
  const targetPath = `/${path}${search}`;
  const targetUrl = `${API_BASE_URL.replace(/\/$/, "")}${targetPath}`;

  const headers = new Headers();
  const incoming = request.headers;
  const passThroughHeaders = ["authorization", "accept-language", "content-type"];
  passThroughHeaders.forEach((name) => {
    const value = incoming.get(name);
    if (value) headers.set(name, value);
  });
  headers.set("accept", incoming.get("accept") ?? "application/json");

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? Buffer.from(await request.arrayBuffer()) : undefined;
  const outboundHeaders = Object.fromEntries(headers.entries());

  try {
    const upstreamResponse = await upstreamClient.request<ArrayBuffer>({
      url: targetPath,
      method,
      data: body,
      headers: outboundHeaders,
    });

    const responseHeaders = new Headers();
    Object.entries(upstreamResponse.headers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        responseHeaders.set(key, value.join(", "));
      } else if (value !== undefined) {
        responseHeaders.set(key, String(value));
      }
    });
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");

    // Decode ArrayBuffer to string for JSON/text so the response body is visible in the Network tab
    const contentType = responseHeaders.get("content-type") ?? "";
    const isJson = contentType.includes("application/json") || contentType.includes("application/problem+json");
    const responseBody: ArrayBuffer | string =
      isJson && upstreamResponse.data && upstreamResponse.data.byteLength > 0
        ? new TextDecoder().decode(upstreamResponse.data)
        : upstreamResponse.data;

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const code =
      (error as { code?: string; cause?: { code?: string } })?.cause?.code ??
      (error as { code?: string })?.code;
    return NextResponse.json(
      {
        message: "Proxy upstream request failed",
        target: targetUrl,
        error: code ?? "FETCH_FAILED",
        detail:
          (error as { message?: string })?.message ??
          "Network error while contacting upstream API",
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: ProxyContext) {
  return handleProxy(request, context);
}

export async function POST(request: NextRequest, context: ProxyContext) {
  return handleProxy(request, context);
}

export async function PUT(request: NextRequest, context: ProxyContext) {
  return handleProxy(request, context);
}

export async function PATCH(request: NextRequest, context: ProxyContext) {
  return handleProxy(request, context);
}

export async function DELETE(request: NextRequest, context: ProxyContext) {
  return handleProxy(request, context);
}

export async function OPTIONS(request: NextRequest, context: ProxyContext) {
  return handleProxy(request, context);
}

