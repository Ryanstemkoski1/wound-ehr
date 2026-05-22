import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escape a value for safe CSV output.
 * - Quotes the cell and doubles internal quotes (RFC 4180).
 * - Neutralizes spreadsheet formula injection by prefixing a cell that begins
 *   with =, +, -, @, tab, or CR with a single quote, so Excel/Sheets treat it
 *   as text instead of executing it (PHI fields can contain attacker input).
 */
export function escapeCsvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}
