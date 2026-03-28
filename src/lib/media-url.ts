/**
 * Image URLs for <img src>. API returns absolute public URLs (e.g. …/uploads/…); use them directly.
 * Local previews (blob:, data:) are unchanged.
 */

export function proxiedImageSrc(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined;
  const url = String(raw).trim();
  if (!url) return undefined;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  return url;
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
