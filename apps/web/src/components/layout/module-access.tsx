'use client';

import { usePathname } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import { useMyModules } from '@/hooks/use-access-control';
import { ADMIN_MODULES, moduleForRoute } from '@/lib/admin-modules';

/**
 * UNIT-24 — the signed-in person's switched-off modules (GET /rbac/me/modules).
 * Empty for a community admin or super admin (locked on), before the API has
 * the switches, and while it loads. UI only: the API refuses the module's
 * admin routes itself (403 module_access_denied); a switch never grants.
 */
export function useBlockedModules(): ReadonlySet<string> {
  const mine = useMyModules();
  return useMemo(() => {
    const data = mine.data;
    if (!data || data.locked) return new Set<string>();
    return new Set(data.modules.filter((module) => !module.enabled).map((module) => module.module_id));
  }, [mine.data]);
}

/** The classic menu ids of switched-off modules. */
export function blockedMenuIds(blocked: ReadonlySet<string>): ReadonlySet<string> {
  return new Set(ADMIN_MODULES.filter((module) => blocked.has(module.id) && module.menuId).map((module) => module.menuId as string));
}

/** Whether a route belongs to a module the person has switched off. */
export function isRouteBlocked(path: string, blocked: ReadonlySet<string>): boolean {
  const module = moduleForRoute(path);
  return Boolean(module && blocked.has(module.id));
}

/** A direct URL to a switched-off module says so instead of showing the screen. */
export function ModuleAccessGate({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const blocked = useBlockedModules();
  if (pathname && isRouteBlocked(pathname, blocked)) {
    return (
      <div role="alert" className="rounded-md border p-6 text-sm text-muted-foreground">
        You do not have access to this module. Ask your community admin to switch it on in Units &amp; Users › Access Control.
      </div>
    );
  }
  return <>{children}</>;
}
