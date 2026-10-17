import { getCurrentTenant, getUser } from '@/lib/auth';

/**
 * Who may save society settings: matches PATCH /tenants/:id/settings, which
 * allows the society's community admin and platform super admins only.
 */
export function canChangeSettings(): boolean {
  const user = getUser();
  if (user?.isSuperAdmin) return true;
  const tenantId = getCurrentTenant();
  return user?.societies.find((s) => s.id === tenantId)?.role === 'community_admin';
}
