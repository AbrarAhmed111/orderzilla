/** Use API image URLs as-is; blob/data previews unchanged. */
export function proxiedImageSrc(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined;
  const url = String(raw).trim();
  if (!url) return undefined;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  return url;
}

export function displayImageSrc(
  localPreview: string | null | undefined,
  remoteOrRelative: string | null | undefined,
): string | undefined {
  const local = localPreview?.trim();
  if (local) return local;
  return proxiedImageSrc(remoteOrRelative);
}
