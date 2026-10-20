/**
 * Whether a request failed because the API route is not deployed yet
 * (404). The admin web ships before the API, so a new screen says "not
 * available yet" instead of failing.
 */
export function isNotDeployed(error: unknown): boolean {
  return (error as { status?: unknown } | null)?.status === 404;
}

/**
 * A 404 for a route the server does not have: it carries no error code.
 * A deployed route that answers 404 for a record it cannot find
 * (e.g. `payer_not_found`) names its code, and its message is shown instead.
 */
export function isRouteMissing(error: unknown): boolean {
  const failure = error as { status?: unknown; code?: unknown } | null;
  return failure?.status === 404 && (failure.code === undefined || failure.code === null || failure.code === '');
}
