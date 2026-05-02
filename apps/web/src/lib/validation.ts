/**
 * Client-side validation + normalization helpers that mirror the
 * `@communityos/shared` Zod schemas on the API. Kept as a separate
 * file (not reusing the shared package) because admin-web does not
 * yet link the monorepo shared package; duplicating three regexes is
 * cheaper than introducing a cross-repo workspace dependency.
 *
 * Every helper returns either a normalized string or an error message.
 * Errors are user-visible — prefer short, concrete language.
 */

export const INDIAN_PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;
/**
 * Demo / E2E account phones — recognised server-side as bypass numbers
 * (`auth.service.ts:isDemoPhone`). Range: +910000000007..+910000000100.
 * Mirror of the same constant in `@communityos/shared`.
 */
export const DEMO_INDIAN_PHONE_REGEX =
  /^\+910000000(00[7-9]|0[1-9]\d|100)$/;
export const VEHICLE_NUMBER_REGEX = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/;
export const NAME_REGEX = /^[\p{L}][\p{L}\s.'-]{1,199}$/u;

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Normalize a phone number to the canonical `+91XXXXXXXXXX` form.
 * Strips whitespace and hyphens, rejects anything not a 10-digit
 * Indian mobile (starting 6-9), with an optional `+91` prefix.
 *
 * Passing an empty string or null returns `{ ok: true, value: '' }`
 * so callers can decide whether optional-empty is acceptable.
 */
export function normalizePhone(input: unknown): ValidationResult {
  const raw = typeof input === 'string' ? input : '';
  const stripped = raw.trim().replace(/[\s-]/g, '');
  if (stripped === '') return { ok: true, value: '' };
  const canonicalCandidate = stripped.startsWith('+91')
    ? stripped
    : `+91${stripped}`;
  const isReal = INDIAN_PHONE_REGEX.test(stripped);
  const isDemo = DEMO_INDIAN_PHONE_REGEX.test(canonicalCandidate);
  if (!isReal && !isDemo) {
    return {
      ok: false,
      error:
        'Phone must be a 10-digit Indian mobile starting 6-9 (optional +91 prefix).',
    };
  }
  return { ok: true, value: canonicalCandidate };
}

/**
 * Validate a personal name. Returns a trimmed string on success.
 * Accepts Unicode letters so Devanagari/Tamil/etc. pass; blocks
 * SQL meta-chars (apostrophe-semicolon sequences).
 */
export function validateName(input: unknown): ValidationResult {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (raw.length < 2) {
    return { ok: false, error: 'Name must be at least 2 characters.' };
  }
  if (raw.length > 200) {
    return { ok: false, error: 'Name must be at most 200 characters.' };
  }
  if (!NAME_REGEX.test(raw)) {
    return {
      ok: false,
      error:
        'Name may only contain letters, spaces, dots, hyphens and apostrophes.',
    };
  }
  return { ok: true, value: raw };
}

/**
 * Validate a short, non-empty piece of prose — visitor purpose,
 * parcel description, narration. Allows letters, digits, spaces and
 * punctuation; rejects the 1-2 char junk (`112`) and SQL noise
 * (`nkl';';lk`) that surfaced in the QA pass.
 */
export function validateDescription(
  input: unknown,
  opts: { min?: number; max?: number; label?: string } = {},
): ValidationResult {
  const min = opts.min ?? 3;
  const max = opts.max ?? 500;
  const label = opts.label ?? 'Value';
  const raw = typeof input === 'string' ? input.trim() : '';
  if (raw.length < min) {
    return {
      ok: false,
      error: `${label} must be at least ${min} characters.`,
    };
  }
  if (raw.length > max) {
    return {
      ok: false,
      error: `${label} must be at most ${max} characters.`,
    };
  }
  if (!/^[\p{L}\p{N}\s.,\-/()&#+:]+$/u.test(raw)) {
    return {
      ok: false,
      error: `${label} may only contain letters, numbers, spaces and basic punctuation.`,
    };
  }
  return { ok: true, value: raw };
}

// ---------------------------------------------------------------------------
// File upload gate — client-side size + MIME check
// ---------------------------------------------------------------------------

/**
 * Max upload size mirrors the server (`MAX_UPLOAD_BYTES` = 25 MB) so
 * users get rejected instantly instead of waiting for the pre-signed
 * PUT to round-trip and fail. Keep in sync with
 * `apps/api/src/modules/upload/upload.controller.ts`.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME_TYPES: ReadonlyArray<string> = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export type FileCheck =
  | { ok: true }
  | { ok: false; error: string };

export function checkUploadFile(file: File): FileCheck {
  if (file.size === 0) {
    return { ok: false, error: 'File is empty.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — maximum 25 MB allowed.`,
    };
  }
  if (
    file.type &&
    !ALLOWED_UPLOAD_MIME_TYPES.includes(file.type.toLowerCase())
  ) {
    return {
      ok: false,
      error: `File type "${file.type}" is not allowed. Use PDF, image, CSV or spreadsheet.`,
    };
  }
  return { ok: true };
}
