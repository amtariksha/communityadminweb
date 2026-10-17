import { getCurrentTenant, getUser } from './auth';

/**
 * The signed-in user's role in the society they are looking at, for
 * shaping the UI only (the API re-checks every request).
 */
export function currentRole(): string | null {
  const user = getUser();
  if (!user) return null;
  if (user.isSuperAdmin) return 'super_admin';
  const tenantId = getCurrentTenant();
  if (!tenantId) return user.role ?? null;
  const tenancy = user.societies.find((society) => society.id === tenantId);
  return tenancy?.role ?? user.role ?? null;
}
