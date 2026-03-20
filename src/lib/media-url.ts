/**
 * Browser-facing image URLs: absolute http(s) go through our proxy to avoid CORS.
 * Local previews (blob:, data:) and /api/* URLs are left unchanged.
 */

export function proxiedImageSrc(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined;
  const url = String(raw).trim();
  if (!url) return undefined;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (url.startsWith("/api/media-proxy") || url.startsWith("/api/proxy")) return url;

  if (/^https?:\/\//i.test(url)) {
    return `/api/media-proxy?url=${encodeURIComponent(url)}`;
  }

  if (url.startsWith("/")) {
    return `/api/proxy${url}`;
  }

  return `/api/proxy/${url.replace(/^\/+/, "")}`;
}

/** Local file preview (blob) wins over remote/path URL. */
export function displayImageSrc(
  localPreview: string | null | undefined,
  remoteOrRelative: string | null | undefined,
): string | undefined {
  const local = localPreview?.trim();
  if (local) return local;
  return proxiedImageSrc(remoteOrRelative);
}
