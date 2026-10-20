import { type ReactNode } from 'react';

/** One link in the standard sidebar. */
export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  feature?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
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
  ShieldCheck,
  Siren,
  Footprints,
  TicketCheck,
  Megaphone,
  Gauge,
  ClipboardCheck,
  Car,
  CalendarCheck,
  Vote,
  Bell,
  Contact,
  DoorOpen,
  Flame,
  Store,
  Wrench,
  Video,
  Wallet,
  ScrollText,
  Gavel,
  ClipboardList,
} from 'lucide-react';

/**
 * Today's sidebar, unchanged. Its labels are the keys of the supervisor
 * allowlist in lib/admin-roles.ts, and its `feature` flags gate the
 * classic menu too (menu-access.ts), so keep both in step with it.
 */
export const standardMenu: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'KPI Command Center', href: '/kpi-dashboard', icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Accounts', href: '/accounts', icon: <BookOpen className="h-4 w-4" />, feature: 'accounts' },
      // FeatPlan — backfill Tally-imported sundry-debtor ledgers
      // that have no customer / unit / member link. AI-parses
      // names like "1001 Mr X" and prompts the admin to approve.
      { label: 'Reconcile Debtors', href: '/accounts/reconcile-debtors', icon: <Sparkles className="h-4 w-4" />, feature: 'accounts' },
      { label: 'Invoices', href: '/invoices', icon: <FileText className="h-4 w-4" />, feature: 'invoices' },
      { label: 'Receipts', href: '/receipts', icon: <Receipt className="h-4 w-4" />, feature: 'receipts' },
      // INC-20 — every unit with what it owes (classic: Income Tracker › Member Income).
      { label: 'Member Dues', href: '/income/members', icon: <IndianRupee className="h-4 w-4" />, feature: 'invoices' },
      { label: 'Vendors', href: '/vendors', icon: <Users className="h-4 w-4" />, feature: 'vendors' },
      { label: 'Customers', href: '/customers', icon: <Users className="h-4 w-4" />, feature: 'vendors' },
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
      // MOVE-16 / MOVE-18: approved move-outs wait here for their NOC and completion.
      { label: 'Move-Outs', href: '/move-in-out/noc', icon: <DoorOpen className="h-4 w-4" />, feature: 'units' },
      { label: 'Member Categories', href: '/setup/categories', icon: <Users className="h-4 w-4" />, feature: 'units' },
      { label: 'KYC Verification', href: '/setup/kyc', icon: <ShieldCheck className="h-4 w-4" />, feature: 'units' },
      // UNIT-33 — surveys share the polls' grid resource and module switch (voting).
      { label: 'Surveys', href: '/units/surveys', icon: <ClipboardList className="h-4 w-4" />, feature: 'voting' },
      { label: 'Gate', href: '/gate', icon: <ShieldCheck className="h-4 w-4" />, feature: 'gate' },
      { label: 'Guard Patrol', href: '/patrol', icon: <Footprints className="h-4 w-4" />, feature: 'gate' },
      { label: 'SOS & Safety', href: '/sos', icon: <Siren className="h-4 w-4" /> },
      { label: 'Utilities', href: '/utilities', icon: <Gauge className="h-4 w-4" />, feature: 'utilities' },
      { label: 'Parking', href: '/parking', icon: <Car className="h-4 w-4" />, feature: 'parking' },
      { label: 'Amenities', href: '/amenities', icon: <CalendarCheck className="h-4 w-4" />, feature: 'amenities' },
      { label: 'Tickets', href: '/tickets', icon: <TicketCheck className="h-4 w-4" />, feature: 'tickets' },
      { label: 'Announcements', href: '/announcements', icon: <Megaphone className="h-4 w-4" />, feature: 'announcements' },
      { label: 'Rules & Violations', href: '/violations/open/awaiting-approval', icon: <Gavel className="h-4 w-4" />, feature: 'violations' },
      { label: 'Community Forms', href: '/community-forms/setup/forms', icon: <ClipboardList className="h-4 w-4" />, feature: 'community_forms' },
      { label: 'Voting', href: '/voting', icon: <Vote className="h-4 w-4" />, feature: 'voting' },
      { label: 'Gas', href: '/gas', icon: <Flame className="h-4 w-4" />, feature: 'gas' },
      { label: 'Marketplace', href: '/marketplace', icon: <Store className="h-4 w-4" />, feature: 'marketplace' },
      { label: 'Events', href: '/events', icon: <CalendarCheck className="h-4 w-4" /> },
      { label: 'Local Directory', href: '/directory', icon: <Contact className="h-4 w-4" /> },
      { label: 'Governance & MoM', href: '/governance', icon: <ScrollText className="h-4 w-4" /> },
      { label: 'Assets', href: '/assets', icon: <Wrench className="h-4 w-4" />, feature: 'assets' },
      { label: 'Inventory & Procurement', href: '/inventory', icon: <ShoppingCart className="h-4 w-4" />, feature: 'assets' },
      { label: 'CCTV', href: '/cctv', icon: <Video className="h-4 w-4" />, feature: 'cctv' },
      { label: 'Staff', href: '/staff', icon: <Users className="h-4 w-4" />, feature: 'staff' },
      // QA #204 — placeholder route until the salaries feature lands.
      { label: 'Salaries', href: '/staff/salaries', icon: <Wallet className="h-4 w-4" />, feature: 'staff' },
      { label: 'Documents', href: '/documents', icon: <FolderOpen className="h-4 w-4" />, feature: 'documents' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Approvals', href: '/approvals', icon: <ClipboardCheck className="h-4 w-4" /> },
      // FeatPlan #OW-3 — vehicle approval queue. Backend
      // (parking.controller.ts:234) gates approve/reject to
      // community_admin / committee_member; non-allowlisted roles
      // see the link but get a 403 toast on attempt. Sidebar
      // doesn't role-gate today; visibility refinement is a
      // follow-up.
      { label: 'Vehicle Approvals', href: '/approvals/vehicles', icon: <Car className="h-4 w-4" /> },
      { label: 'Notifications', href: '/notifications', icon: <Bell className="h-4 w-4" /> },
      { label: 'Audit Trail', href: '/audit', icon: <ScrollText className="h-4 w-4" /> },
      { label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" /> },
    ],
  },
];
