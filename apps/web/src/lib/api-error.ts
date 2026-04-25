import {
  lookupErrorCode,
  type ApiErrorEnvelope,
} from '@communityos/shared';

/**
 * Typed wrapper around the server's 4xx/5xx envelope. Thrown by
 * `lib/api.ts` on any non-2xx response; consumed by:
 *
 * - Global QueryCache `onError` toast (query-provider.tsx).
 * - Every mutation `onError` handler — prefer `err.userMessage`
 *   for the toast description.
 * - `useApiFieldError` hook / `<FormFieldError>` component for
 *   inline field-level rendering on forms.
 *
 * `userMessage` priority order (first hit wins):
 *   1. `ERROR_CODES[code].userMessage` — stable across server
 *      wording tweaks.
 *   2. First entry in `envelope.errors` — Zod field-level message.
 *   3. `envelope.message` — server-side human-readable string.
 *   4. `friendlyStatusMessage(status)` — last-resort generic copy.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly envelope: ApiErrorEnvelope,
  ) {
    super(
      typeof envelope.message === 'string'
        ? envelope.message
        : envelope.message[0] ?? 'Request failed',
    );
    this.name = 'ApiError';
  }

  /** Stable error code, if the server set one. */
  get code(): string | undefined {
    return this.envelope.code;
  }

  /**
   * Flattened field-error map. Backend emits
   * `errors: { phone: ["must be...", "..."] }`; we return the first
   * message per field so forms can render it directly without an
   * array lookup. Multiple-rule-per-field is rare and the first
   * rule is usually the most actionable.
   */
  get fieldErrors(): Record<string, string> {
    const raw = this.envelope.errors;
    if (!raw) return {};
    const flat: Record<string, string> = {};
    for (const [field, messages] of Object.entries(raw)) {
      if (Array.isArray(messages) && messages.length > 0) {
        flat[field] = messages[0];
      }
    }
    return flat;
  }

  /** `retry_after_seconds` surfaced from the envelope (429 only). */
  get retryAfterSeconds(): number | undefined {
    return this.envelope.retry_after_seconds;
  }

  /**
   * Code-specific extra payload (e.g. `tenants` on the soft-delete
   * `last_admin_orphaning` response). Callers branch on `.code` first,
   * then read whatever shape `details` has for that code.
   */
  get details(): Record<string, unknown> | undefined {
    return this.envelope.details;
  }

  /** Server request ID for support + log correlation. */
  get requestId(): string | undefined {
    return this.envelope.request_id;
  }

  /**
   * Primary user-facing message. See class docstring for priority.
   * Never returns tech jargon — the shared `ERROR_CODES` map is
   * the safety net.
   */
  get userMessage(): string {
    // 1. Error code wins — stable + concise + safe.
    const codeDef = lookupErrorCode(this.code);
    if (codeDef) return codeDef.userMessage;

    // 2. Field errors — use the first one as the toast summary.
    const fieldEntries = Object.entries(this.fieldErrors);
    if (fieldEntries.length > 0) {
      const [field, msg] = fieldEntries[0];
      if (fieldEntries.length === 1) return msg;
      // Multiple field errors: show the first + a count so the user
      // knows there are more. Inline rendering on the form surfaces
      // the rest.
      return `${msg} (+${fieldEntries.length - 1} more ${fieldEntries.length === 2 ? 'issue' : 'issues'})`;
    }

    // 3. Server message, if any.
    const msg = this.envelope.message;
    if (typeof msg === 'string' && msg.length > 0) return msg;
    if (Array.isArray(msg) && msg.length > 0) return msg[0];

    // 4. Fall back on status code.
    return friendlyStatusMessage(this.status);
  }
}

/**
 * Generic copy for when the envelope has no useful `message` or
 * `code`. Used as the last-resort branch of `ApiError.userMessage`.
 */
export function friendlyStatusMessage(status: number): string {
  if (status === 400) return 'That looks off — please check the form and try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 404) return 'We could not find what you were looking for.';
  if (status === 409) return 'This conflicts with existing data. Refresh and try again.';
  if (status === 422) return 'Some fields did not pass validation. Please review and retry.';
  if (status === 429) return 'You are going too fast. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our end. Please try again in a minute.';
  return 'Something went wrong. Please try again.';
}

/**
 * Narrowing helper — TypeScript's default `unknown` catch sites
 * can't directly use `err.userMessage`. Call this to safely pick
 * up an ApiError while falling back to a generic string for
 * anything else (network errors, programming errors).
 */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return err.userMessage;
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}
