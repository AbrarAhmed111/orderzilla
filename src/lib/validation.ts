/**
 * Strict realtime validation rules for forms and modals.
 * Validates on every change; errors show immediately when invalid.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[\d\s+\-()]*$/;

export type ValidationRule =
  | { type: "required"; message: string }
  | { type: "minLength"; value: number; message: string }
  | { type: "maxLength"; value: number; message: string }
  | { type: "email"; message?: string }
  | { type: "phone"; message?: string }
  | { type: "pattern"; regex: RegExp; message: string }
  | { type: "number"; min?: number; max?: number; integer?: boolean; message?: string }
  | { type: "custom"; validate: (v: string) => string | null };

export function validateField(value: string, rules: ValidationRule[]): string | null {
  const trimmed = value.trim();
  for (const rule of rules) {
    const err = applyRule(trimmed, value, rule);
    if (err) return err;
  }
  return null;
}

function applyRule(trimmed: string, raw: string, rule: ValidationRule): string | null {
  switch (rule.type) {
    case "required":
      if (!trimmed) return rule.message;
      break;
    case "minLength":
      if (trimmed.length > 0 && trimmed.length < rule.value) return rule.message;
      break;
    case "maxLength":
      if (trimmed.length > rule.value) return rule.message;
      break;
    case "email":
      if (trimmed.length > 0 && !EMAIL_REGEX.test(trimmed))
        return rule.message ?? "Enter a valid email address.";
      break;
    case "phone":
      if (trimmed.length > 0 && !PHONE_REGEX.test(trimmed))
        return rule.message ?? "Enter a valid phone number.";
      break;
    case "pattern":
      if (trimmed.length > 0 && !rule.regex.test(trimmed)) return rule.message;
      break;
    case "number": {
      if (trimmed.length === 0) break;
      const n = Number(raw);
      if (!Number.isFinite(n)) return rule.message ?? "Must be a valid number.";
      if (rule.integer && !Number.isInteger(n)) return rule.message ?? "Must be a whole number.";
      if (rule.min !== undefined && n < rule.min)
        return rule.message ?? `Must be at least ${rule.min}.`;
      if (rule.max !== undefined && n > rule.max)
        return rule.message ?? `Must be at most ${rule.max}.`;
      break;
    }
    case "custom":
      return rule.validate(raw);
  }
  return null;
}

/** Run validation only when user has interacted (touched) or value is non-empty */
export function shouldShowError(value: string, touched: boolean, error: string | null): boolean {
  if (!error) return false;
  return touched || value.trim().length > 0;
}
