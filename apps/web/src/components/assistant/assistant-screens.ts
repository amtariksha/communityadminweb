'use client';

import { useMemo } from 'react';
import { useEnabledFeatures, useTicketScope } from '@/hooks';
import type { AssistantScreen } from '@/hooks/use-assistant';
import { applyTicketScope, getSidebarAllowlist, isDelegatedTicketRole } from '@/lib/admin-roles';
import { useAdminLayout } from '@/lib/layout-context';
import { screenEntries } from '../layout/classic/screen-finder';
import { currentMenuRole, useClassicMenu } from '../layout/classic/use-classic-menu';
import type { MenuNode } from '../layout/menu/classic-menu';
import { isRouteBlocked, useBlockedModules } from '../layout/module-access';
import { standardMenu, type NavGroup } from '../layout/menu/standard-menu';

const MAX_SCREENS = 600;

/**
 * In-app paths only, the same rule the API applies (web-route-modules.ts):
 * no scheme, no `//`, no backslash, no `.` or `..` segment, a plain query.
 */
export const SAFE_APP_PATH = /^\/(?!\/)[A-Za-z0-9\-_.~/[\]]*(?:\?[A-Za-z0-9\-_=&]*)?$/;

export function isSafeAppPath(href: string): boolean {
  if (href.length > 300 || !SAFE_APP_PATH.test(href)) return false;
  const segments = href.split('?')[0].split('/').slice(1);
  if (segments.length === 1 && segments[0] === '') return true;
  return segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

interface StandardAccess {
  enabledFeatures?: readonly string[] | null;
  roleAllowlist: ReadonlySet<string> | null;
  blocked: ReadonlySet<string>;
}

/** The standard sidebar's entries as the person sees them, "Group › Label". */
export function standardScreens(groups: readonly NavGroup[], access: StandardAccess): AssistantScreen[] {
  return groups.flatMap((group) =>
    group.items
      .filter((item) => !item.feature || !access.enabledFeatures || access.enabledFeatures.includes(item.feature))
      .filter((item) => !access.roleAllowlist || access.roleAllowlist.has(item.label))
      .filter((item) => !isRouteBlocked(item.href, access.blocked))
      .map((item) => ({ path: `${group.label} › ${item.label}`, href: item.href })),
  );
}

/** The classic menu's screens as the person sees them, "Module › Child › Tab". */
export function classicScreens(menu: readonly MenuNode[]): AssistantScreen[] {
  return screenEntries(menu).map((entry) => ({ path: entry.path, href: entry.href }));
}

function sendable(screens: readonly AssistantScreen[]): AssistantScreen[] {
  const unique = new Map(screens.filter((screen) => isSafeAppPath(screen.href)).map((screen) => [`${screen.path}|${screen.href}`, screen]));
  return [...unique.values()].map((screen) => ({ path: screen.path.slice(0, 200), href: screen.href })).slice(0, MAX_SCREENS);
}

/**
 * The screens of the person's own menu in the layout they use (SB-02), for
 * the Assistant's "find a screen". UI only: the API filters them by the
 * person's module switches again, and every screen checks access itself.
 */
export function useAssistantScreens(): AssistantScreen[] {
  const layout = useAdminLayout();
  const classic = useClassicMenu();
  const { data: enabledFeatures } = useEnabledFeatures();
  const role = currentMenuRole();
  const { data: ticketScope } = useTicketScope(isDelegatedTicketRole(role));
  const blocked = useBlockedModules();
  return useMemo(() => {
    if (layout === 'classic') return sendable(classicScreens(classic));
    const roleAllowlist = applyTicketScope(getSidebarAllowlist(role), role, ticketScope);
    return sendable(standardScreens(standardMenu, { enabledFeatures, roleAllowlist, blocked }));
  }, [layout, classic, enabledFeatures, role, ticketScope, blocked]);
}
