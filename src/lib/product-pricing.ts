/**
 * Helpers for product price rules (dashboard create/edit).
 * API may return mode variants (e.g. take_away) that must map to OpenAPI enums.
 */

export type PriceRuleMode = "INDOOR" | "TAKEAWAY" | "BOTH";

export function normalizePriceMode(raw: unknown): PriceRuleMode {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (s === "INDOOR") return "INDOOR";
  if (s === "TAKEAWAY" || s === "TAKE_AWAY" || s === "TAKEOUT" || s === "TO_GO") return "TAKEAWAY";
  if (s === "BOTH" || s === "ALL") return "BOTH";
  return "BOTH";
}

export function priceRuleScopeKey(parts: {
  mode: PriceRuleMode;
  location_id: string;
  terminal_id: string;
  valid_from: string;
  valid_until: string;
}): string {
  return [
    parts.mode,
    parts.location_id.trim(),
    parts.terminal_id.trim(),
    parts.valid_from.trim(),
    parts.valid_until.trim(),
  ].join("\u0001");
}

/** Collapse duplicate rows (same scope); prefer the row that already has a server price id. */
export function dedupePriceRulesForSave<
  T extends {
    mode: PriceRuleMode;
    location_id?: string;
    terminal_id?: string;
    valid_from?: string;
    valid_until?: string;
    price: string;
    priceId?: string;
  },
>(rows: T[]): T[] {
  const withIds = rows.filter((r) => Boolean(r.priceId?.trim()));
  const withoutIds = rows.filter((r) => !r.priceId?.trim());
  const ordered = [...withIds, ...withoutIds];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of ordered) {
    const key = priceRuleScopeKey({
      mode: row.mode,
      location_id: row.location_id ?? "",
      terminal_id: row.terminal_id ?? "",
      valid_from: row.valid_from ?? "",
      valid_until: row.valid_until ?? "",
    });
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
