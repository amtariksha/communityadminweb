/**
 * Whether a request failed because the API route is not deployed yet
 * (404). The admin web ships before the API, so a new screen says "not
 * available yet" instead of failing.
 */
export function isNotDeployed(error: unknown): boolean {
  return (error as { status?: unknown } | null)?.status === 404;
}
