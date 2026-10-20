'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEnabledFeatures, useTicketScope } from '@/hooks';
import { useHelpMode } from '@/lib/help-mode-context';
import { HELP_MODE_TEXT } from '@/lib/tooltip-content';
import { Tooltip } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, getInitials } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { SocietyLogo } from '@/components/society-logo';
import { getUser, getCurrentTenant, logout } from '@/lib/auth';
import { applyTicketScope, getSidebarAllowlist, isDelegatedTicketRole, pickDisplayRole } from '@/lib/admin-roles';
import { standardMenu, type NavItem } from './menu/standard-menu';
import { isRouteBlocked, useBlockedModules } from './module-access';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/**
 * snake_case role slug → "Snake Case Role" for display in the
 * sidebar chrome. Returns "Admin" for undefined (the user has no
 * admin role at all — the no-access router should already be
 * handling this case, but the chrome shouldn't render a blank).
 */
export function formatRoleLabel(role: string | undefined): string {
  if (!role) return 'Admin';
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Indian phone numbers come from the API as `+91XXXXXXXXXX`. Render
 * them as `+91 XXXXX XXXXX` so the avatar fallback for users whose
 * `name` is empty (super admins, freshly-onboarded staff) is at
 * least visually parseable. Anything that doesn't match the +91+10
 * shape is returned verbatim — we don't want to mangle international
 * numbers we may pick up later.
 */
function formatPhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const match = phone.match(/^\+91(\d{5})(\d{5})$/);
  if (!match) return phone;
  return `+91 ${match[1]} ${match[2]}`;
}

/**
 * Display name with a graceful fallback chain — fixes QA #12-2
 * where super-admins have `user.name === ""` (no membership row,
 * no profile name set) and the previous `user?.name ?? 'Admin User'`
 * dropped through to an empty string because `??` only catches
 * null/undefined, not "".
 *
 * Priority:
 *   1. user.name (if non-empty after trim)
 *   2. formatted user.phone
 *   3. "Super Admin" if isSuperAdmin
 *   4. "Account" — last-resort, never blank
 */
export function resolveDisplayName(
  user: ReturnType<typeof getUser>,
): string {
  const trimmed = user?.name?.trim();
  if (trimmed) return trimmed;
  const phone = formatPhone(user?.phone);
  if (phone) return phone;
  if (user?.isSuperAdmin) return 'Super Admin';
  return 'Account';
}

export function Sidebar({ open, onClose }: SidebarProps): ReactNode {
  const pathname = usePathname();
  const user = getUser();
  const userName = resolveDisplayName(user);
  const { data: enabledFeatures } = useEnabledFeatures();
  const { isHelpMode } = useHelpMode();

  // Role-based sidebar gating: supervisor roles see only a curated
  // subset of the full nav. Broader admin roles see everything.
  // Resolved against the CURRENT tenant's role (the one the user
  // picked on /select-tenant) so a user who's community_admin at one
  // society and security_supervisor at another gets the right view
  // per society.
  //
  // QA #12-2 — super-admin escape hatch: when a super-admin is
  // impersonating a tenant from /super-admin, `user.societies` is
  // empty (super-admins have no per-tenant membership row), so
  // `find()` returns undefined and `getSidebarAllowlist(undefined)`
  // produces the defensive EMPTY_NAV_SET. Result: blank sidebar.
  // Treat super-admin as if they hold the broadest admin role so
  // the allowlist resolves to `null` (= show everything). This is
  // UI-only; backend RBAC still re-derives roles from the JWT
  // (super_admin role), so a tampered localStorage flag changes
  // nothing on the wire (cf. the SECURITY STANCE comment in
  // admin-roles.ts).
  const currentTenantId = getCurrentTenant();
  const currentRole = user?.isSuperAdmin
    ? 'super_admin'
    : user?.societies.find((s) => s.id === currentTenantId)?.role;
  // A security or facility supervisor reaches Tickets only while their
  // role-delegation switch is on; the server says whether it is.
  const ticketScope = useTicketScope(isDelegatedTicketRole(currentRole));
  const roleAllowlist = applyTicketScope(getSidebarAllowlist(currentRole), currentRole, ticketScope.data);
  // Display role at the bottom of the sidebar — picks the user's
  // admin-eligible role for the current tenant, falling back to
  // their highest-priority admin role across any tenant. Avoids the
  // pre-2026-04-25 bug where a user added as community_admin to
  // Tenant B who was also a tenant_resident at Tenant A saw
  // "tenant_resident" displayed in the admin sidebar.
  const displayRole = user ? pickDisplayRole(user, currentTenantId) : undefined;

  function isActive(href: string): boolean {
    if (href === '/') {
      return pathname === '/';
    }
    // Exact match takes priority for sub-routes (e.g., /units/directory vs /units)
    if (pathname === href) return true;
    // Only match parent route if pathname doesn't match a more specific sibling
    if (pathname.startsWith(href + '/')) {
      // Check if there is a more specific nav item that matches
      const allItems = standardMenu.flatMap((g) => g.items);
      const hasMoreSpecific = allItems.some(
        (item) => item.href !== href && item.href.startsWith(href + '/') && pathname.startsWith(item.href),
      );
      return !hasMoreSpecific;
    }
    return false;
  }

  function isFeatureVisible(item: NavItem): boolean {
    if (!item.feature) return true;
    if (!enabledFeatures) return true;
    return enabledFeatures.includes(item.feature);
  }

  // UNIT-24 — modules the person's switches turn off (never more than the role).
  const blockedModules = useBlockedModules();

  function isRoleVisible(item: NavItem): boolean {
    // null allowlist = broader admin role, show everything.
    if (!roleAllowlist) return true;
    return roleAllowlist.has(item.label);
  }

  return (
    <>
      {open && (
        // QA #113 — backdrop visible at every viewport below md
        // (768px). Was lg:hidden which kept the sidebar overlaid
        // on tablets up to 1024px even though the layout has
        // room for it inline.
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          // QA #113 — sidebar collapses to drawer at <md (768px),
          // sits inline at md+. Matches the hamburger toggle
          // visibility in header.tsx so the two stay in sync.
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:z-auto md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SocietyLogo />

        <Separator />

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {standardMenu.map((group) => {
            const visibleItems = group.items
              .filter(isFeatureVisible)
              .filter(isRoleVisible)
              .filter((item) => !isRouteBlocked(item.href, blockedModules));
            if (visibleItems.length === 0) return null;
            return (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const helpKey = `nav.${item.label.toLowerCase()}`;
                  const helpText = HELP_MODE_TEXT[helpKey];
                  const link = (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                  return (
                    <li key={item.href}>
                      {isHelpMode && helpText ? (
                        <Tooltip content={helpText} side="right">
                          {link}
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            );
          })}
        </nav>

        <Separator />

        <div className="p-3 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar size="sm">
              <AvatarFallback>{getInitials(userName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">{formatRoleLabel(displayRole)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
