/**
 * Wire format for every 4xx / 5xx response emitted by the NestJS
 * `HttpExceptionFilter`. This is the single source of truth that
 * admin web (TypeScript `ApiError` class) and the Flutter apps
 * (Dart `ApiException.fromDio`) both deserialize against.
 *
 * Fields:
 * - `statusCode`   — HTTP status, duplicated in the body so clients
 *                    don't have to read `response.status` separately.
 * - `message`      — primary human-readable message. For Zod
 *                    failures this is "Validation failed" and the
 *                    per-field detail lives in `errors`.
 * - `error`        — the exception class name (`BadRequestException`,
 *                    `ForbiddenException`, `DuplicateRecord`, etc).
 *                    Helpful for logging; not shown to users.
 * - `errors`       — Zod field-level map. One entry per rejected
 *                    field; each value is an array so multiple rules
 *                    on the same field can accumulate.
 * - `code`         — optional stable error code (snake_case). When
 *                    present, clients should prefer looking the code
 *                    up in `ERROR_CODES` over rendering `message`
 *                    directly. Unlocks UI that branches by error kind
 *                    (e.g. "Edit existing unit" button on a
 *                    `unit_number_exists` conflict).
 * - `retry_after_seconds` — only set on 429 rate-limit responses so
 *                    clients can render a countdown.
 * - `request_id`   — UUID for log correlation. Show it in "Contact
 *                    support" flows so ops can grep the server log.
 * - `timestamp`    — ISO8601 UTC.
 */
export interface ApiErrorEnvelope {
  statusCode: number;
  message: string | string[];
  error: string;
  errors?: Record<string, string[]>;
  code?: string;
  retry_after_seconds?: number;
  request_id: string;
  timestamp: string;
}
