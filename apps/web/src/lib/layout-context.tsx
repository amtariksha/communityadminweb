'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useCurrentUser } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenants';
import { getCurrentTenant, getUser, type User } from './auth';
import {
  applyLayoutAttribute,
  DEFAULT_ADMIN_LAYOUT,
  normalizeAdminLayout,
  readStoredLayout,
  storeLayout,
  type AdminLayout,
} from './admin-layout';

interface LayoutSources {
  tenantId: string | null;
  // /auth/me, once it has answered.
  freshUser?: Pick<User, 'societies'> | null;
  // The user written to the browser at sign-in.
  cachedUser?: Pick<User, 'societies'> | null;
  // The society's settings, fetched only for super admins (they hold no
  // society entry of their own).
  tenantSettings?: { admin_layout?: unknown } | null;
  // The copy kept in the browser from the last visit.
  stored?: AdminLayout | null;
}

function societyLayout(
  user: Pick<User, 'societies'> | null | undefined,
  tenantId: string,
): AdminLayout | undefined {
  return user?.societies.find((s) => s.id === tenantId)?.admin_layout;
}

/** Most authoritative source first; anything unrecognised is standard. */
export function resolveAdminLayout(sources: LayoutSources): AdminLayout {
  const { tenantId } = sources;
  if (!tenantId) return DEFAULT_ADMIN_LAYOUT;
  const candidate =
    sources.tenantSettings?.admin_layout ??
    societyLayout(sources.freshUser, tenantId) ??
    societyLayout(sources.cachedUser, tenantId) ??
    sources.stored ??
    DEFAULT_ADMIN_LAYOUT;
  return normalizeAdminLayout(candidate);
}

const LayoutContext = createContext<AdminLayout>(DEFAULT_ADMIN_LAYOUT);

export function LayoutProvider({ children }: { children: ReactNode }): ReactNode {
  const tenantId = getCurrentTenant();
  const cachedUser = getUser();
  const { data: freshUser } = useCurrentUser();
  const isSuperAdmin = cachedUser?.isSuperAdmin === true;
  const { data: tenant } = useTenant(isSuperAdmin && tenantId ? tenantId : '');

  const layout = resolveAdminLayout({
    tenantId,
    freshUser,
    cachedUser,
    tenantSettings: tenant?.settings_json,
    stored: readStoredLayout(tenantId),
  });

  useEffect(() => {
    applyLayoutAttribute(layout);
    if (tenantId) storeLayout(tenantId, layout);
  }, [layout, tenantId]);

  // Pages outside the dashboard (sign-in, super admin console) always
  // use the standard look.
  useEffect(() => () => applyLayoutAttribute(DEFAULT_ADMIN_LAYOUT), []);

  return <LayoutContext.Provider value={layout}>{children}</LayoutContext.Provider>;
}

export function useAdminLayout(): AdminLayout {
  return useContext(LayoutContext);
}
