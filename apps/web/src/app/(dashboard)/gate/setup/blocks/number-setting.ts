/**
 * A whole-number setting typed into a box where empty means "off" (null):
 * the value to save, or the message to show.
 */
export type OptionalWholeNumber = { ok: true; value: number | null } | { ok: false; message: string };

export function readOptionalWholeNumber(text: string, min: number, max: number, unit: string): OptionalWholeNumber {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value: null };
  const value = Number(trimmed);
  if (!Number.isInteger(value)) return { ok: false, message: `Enter a whole number of ${unit}, or leave it empty for off.` };
  if (value < min || value > max) return { ok: false, message: `Between ${min} and ${max} ${unit}, or empty for off.` };
  return { ok: true, value };
}

/** The text a saved value shows as (empty for off). */
export const textOf = (value: number | null | undefined): string => (value === null || value === undefined ? '' : String(value));
