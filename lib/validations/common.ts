// Small validation helpers for Server Action inputs
//
// Server Actions are reachable from any authenticated browser session.
// Even though Supabase RLS protects the actual rows, we still want to
// reject malformed IDs at the boundary before issuing queries (avoids
// Postgres error spam, and gives clear 400-style messages).

import { z } from "zod";

export const uuidSchema = z.string().uuid("Invalid ID format");

/**
 * Strict UUID validator. Returns the parsed string or throws a
 * `ValidationError` with a user-friendly message.
 */
export function assertUuid(value: unknown, name = "id"): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(`${name} must be a valid UUID`);
  }
  return result.data;
}

/**
 * Soft UUID validator. Returns null when invalid instead of throwing.
 * Useful at boundaries that want to short-circuit with a typed error.
 */
export function tryUuid(value: unknown): string | null {
  const result = uuidSchema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * Marker error class so callers can `if (err instanceof ValidationError)`.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export type NumericRule = { field: string; min?: number; max?: number };

/**
 * Validate that the named numeric fields on a server-action payload are finite
 * numbers within optional bounds. Nullish/empty values are skipped (optional
 * fields). Returns an error message, or null when all rules pass.
 *
 * Postgres already rejects type-invalid input for numeric columns; this guards
 * the residual gap that client forms catch but a direct action call would not:
 * NaN/Infinity and out-of-range-but-valid values (e.g. a blood pressure of 9999).
 */
export function numericFieldError(
  data: Record<string, unknown>,
  rules: NumericRule[]
): string | null {
  for (const { field, min, max } of rules) {
    const raw = data[field];
    if (raw === null || raw === undefined || raw === "") continue;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return `${field} must be a number.`;
    if (min !== undefined && n < min) return `${field} must be at least ${min}.`;
    if (max !== undefined && n > max) return `${field} must be at most ${max}.`;
  }
  return null;
}
