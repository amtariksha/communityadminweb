'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { type ReactNode } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Receipt,
  Users,
  ShoppingCart,
  Landmark,
  BarChart3,
  Home,
  FolderOpen,
  IndianRupee,
  Settings,
  LogOut,
  Building2,
  ShieldCheck,
  TicketCheck,
  Megaphone,
  Gauge,
  ClipboardCheck,
  Car,
  CalendarCheck,
  Vote,
  Bell,
  Contact,
  Flame,
  Store,
  Wrench,
  Video,
  ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEnabledFeatures } from '@/hooks';
import { useHelpMode } from '@/lib/help-mode-context';
import { HELP_MODE_TEXT } from '@/lib/tooltip-content';
import { Tooltip } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, getInitials } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { getUser, getCurrentTenant, logout } from '@/lib/auth';
import { getSidebarAllowlist, pickDisplayRole } from '@/lib/admin-roles';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  feature?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Accounts', href: '/accounts', icon: <BookOpen className="h-4 w-4" />, feature: 'accounts' },
      { label: 'Invoices', href: '/invoices', icon: <FileText className="h-4 w-4" />, feature: 'invoices' },
      { label: 'Receipts', href: '/receipts', icon: <Receipt className="h-4 w-4" />, feature: 'receipts' },
      { label: 'Vendors', href: '/vendors', icon: <Users className="h-4 w-4" />, feature: 'vendors' },
      { label: 'Purchases', href: '/purchases', icon: <ShoppingCart className="h-4 w-4" />, feature: 'purchases' },
      { label: 'Payments', href: '/payments', icon: <IndianRupee className="h-4 w-4" />, feature: 'payments' },
      { label: 'Bank', href: '/bank', icon: <Landmark className="h-4 w-4" />, feature: 'bank' },
      { label: 'Reports', href: '/reports', icon: <BarChart3 className="h-4 w-4" />, feature: 'reports' },
      { label: 'Tax & Compliance', href: '/tax', icon: <Receipt className="h-4 w-4" />, feature: 'reports' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Units', href: '/units', icon: <Home className="h-4 w-4" />, feature: 'units' },
      { label: 'Member Directory', href: '/units/directory', icon: <Contact className="h-4 w-4" />, feature: 'units' },
      { label: 'Gate', href: '/gate', icon: <ShieldCheck className="h-4 w-4" />, feature: 'gate' },
      { label: 'Utilities', href: '/utilities', icon: <Gauge className="h-4 w-4" />, feature: 'utilities' },
      { label: 'Parking', href: '/parking', icon: <Car className="h-4 w-4" />, feature: 'parking' },
      { label: 'Amenities', href: '/amenities', icon: <CalendarCheck className="h-4 w-4" />, feature: 'amenities' },
      { label: 'Tickets', href: '/tickets', icon: <TicketCheck className="h-4 w-4" />, feature: 'tickets' },
      { label: 'Announcements', href: '/announcements', icon: <Megaphone className="h-4 w-4" />, feature: 'announcements' },
      { label: 'Voting', href: '/voting', icon: <Vote className="h-4 w-4" />, feature: 'voting' },
      { label: 'Gas', href: '/gas', icon: <Flame className="h-4 w-4" />, feature: 'gas' },
      { label: 'Marketplace', href: '/marketplace', icon: <Store className="h-4 w-4" />, feature: 'marketplace' },
      { label: 'Assets', href: '/assets', icon: <Wrench className="h-4 w-4" />, feature: 'assets' },
      { label: 'CCTV', href: '/cctv', icon: <Video className="h-4 w-4" />, feature: 'cctv' },
      { label: 'Staff', href: '/staff', icon: <Users className="h-4 w-4" />, feature: 'staff' },
      { label: 'Documents', href: '/documents', icon: <FolderOpen className="h-4 w-4" />, feature: 'documents' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Approvals', href: '/approvals', icon: <ClipboardCheck className="h-4 w-4" /> },
      { label: 'Notifications', href: '/notifications', icon: <Bell className="h-4 w-4" /> },
      { label: 'Audit Trail', href: '/audit', icon: <ScrollText className="h-4 w-4" /> },
      { label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

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
function formatRoleLabel(role: string | undefined): string {
  if (!role) return 'Admin';
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function Sidebar({ open, onClose }: SidebarProps): ReactNode {
  const pathname = usePathname();
  const user = getUser();
  const userName = user?.name ?? 'Admin User';
  const { data: enabledFeatures } = useEnabledFeatures();
  const { isHelpMode } = useHelpMode();

  // Role-based sidebar gating: supervisor roles see only a curated
  // subset of the full nav. Broader admin roles see everything.
  // Resolved against the CURRENT tenant's role (the one the user
  // picked on /select-tenant) so a user who's community_admin at one
  // society and security_supervisor at another gets the right view
  // per society.
  const currentTenantId = getCurrentTenant();
  const currentRole = user?.societies.find((s) => s.id === currentTenantId)?.role;
  const roleAllowlist = getSidebarAllowlist(currentRole);
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
      const allItems = navGroups.flatMap((g) => g.items);
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

  function isRoleVisible(item: NavItem): boolean {
    // null allowlist = broader admin role, show everything.
    if (!roleAllowlist) return true;
    return roleAllowlist.has(item.label);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5A623]">
            <span className="text-lg font-bold text-white">e</span>
          </div>
          <span className="text-lg font-bold">Eassy Society</span>
        </div>

        <Separator />

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => {
            const visibleItems = group.items
              .filter(isFeatureVisible)
              .filter(isRoleVisible);
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
