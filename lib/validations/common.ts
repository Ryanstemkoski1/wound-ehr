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
