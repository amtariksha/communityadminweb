/**
 * The investigator unlock (GATE-43): after the one-time code, the API hands
 * back a token good for 15 minutes for one scope (visitors or vehicles). It
 * is kept for this browser tab only (sessionStorage, wrapped in try/catch)
 * and sent as `x-gate-unlock` on the log reads and exports.
 */

export type UnlockScope = 'visitors' | 'vehicles';

export const UNLOCK_HEADER = 'x-gate-unlock';

interface StoredUnlock {
  token: string;
  expiresAt: number;
}

const memory = new Map<UnlockScope, StoredUnlock>();
const storageKey = (scope: UnlockScope): string => `cos.gate-unlock.${scope}`;

function readStored(scope: UnlockScope): StoredUnlock | null {
  const held = memory.get(scope);
  if (held) return held;
  try {
    const raw = window.sessionStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredUnlock;
    return typeof parsed.token === 'string' && typeof parsed.expiresAt === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

/** Keeps the token the API returned for the scope. */
export function saveUnlock(scope: UnlockScope, token: string, expiresAtIso: string): void {
  const unlock = { token, expiresAt: new Date(expiresAtIso).getTime() };
  memory.set(scope, unlock);
  try {
    window.sessionStorage.setItem(storageKey(scope), JSON.stringify(unlock));
  } catch {
    // Private windows may refuse storage; the token still lives in memory.
  }
}

export function clearUnlock(scope: UnlockScope): void {
  memory.delete(scope);
  try {
    window.sessionStorage.removeItem(storageKey(scope));
  } catch {
    // Nothing stored.
  }
}

/** The live token for the scope, or null once it has expired. */
export function liveUnlock(scope: UnlockScope, now: number = Date.now()): string | null {
  const stored = readStored(scope);
  if (!stored) return null;
  if (stored.expiresAt <= now) {
    clearUnlock(scope);
    return null;
  }
  return stored.token;
}

/** The header to send for the scope (empty when there is no live unlock). */
export function unlockHeaders(scope: UnlockScope): Record<string, string> {
  const token = liveUnlock(scope);
  return token ? { [UNLOCK_HEADER]: token } : {};
}

/** Whether an API error is the lock (423 investigator_locked). */
export function isLocked(error: unknown): boolean {
  const failure = error as { status?: unknown; code?: unknown } | null;
  return failure?.status === 423 || failure?.code === 'investigator_locked';
}
