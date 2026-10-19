import { type ReactNode } from 'react';
import {
  LayoutDashboard,
  Home,
  TicketCheck,
  IndianRupee,
  ShoppingCart,
  Landmark,
  BookOpen,
  Gauge,
  ShieldCheck,
  Users,
  ArrowLeftRight,
  Car,
  CalendarCheck,
  Gavel,
  ClipboardList,
  ScrollText,
  Wrench,
  Megaphone,
  Store,
  FolderOpen,
  Building2,
  BarChart3,
  Ellipsis,
} from 'lucide-react';
import { HELPDESK_BASE, HELPDESK_SCOPES } from '@/lib/helpdesk-scopes';
import { statusMenuChildren } from './status-menu';

/**
 * One entry in the classic menu (requirements SB-02, Part 3.3).
 *
 * - `href`: the screen it opens. Only routes that exist today; a module
 *   ticket points it at the module's own route when it builds one.
 * - `children`: second level in the left menu.
 * - `tabs`: sub-tabs drawn by the module frame (SB-03); the menu entry
 *   opens the first one the user may see.
 * - `planned`: the ticket that builds the screen. Planned entries are
 *   kept here so the menu shape is complete, but are never shown.
 * - `aliases`: today's routes for the same screen. Links inside pages
 *   still use them, and they keep such pages inside their classic
 *   module and frame.
 *
 * Feature flags and supervisor visibility are not repeated here: they
 * come from the standard menu entry for the same route (menu-access.ts).
 */
export interface MenuNode {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  children?: MenuNode[];
  tabs?: MenuNode[];
  planned?: string;
  aliases?: string[];
  // Audit record types the screen shows; the frame offers Show Logs
  // over them (SB-06).
  logs?: string[];
  // Button on every page of the module, e.g. "Create Request" (SB-03).
  create?: { label: string; href: string };
  // Key of the count shown beside the entry, e.g. a status list's
  // number of records (SB-05).
  badgeKey?: string;
  // Where Close goes on the module's pages, when it is not the module's
  // first child (SB-03), e.g. HelpDesk closes to its request list.
  close?: string;
  // Form pages of a module or child besides the module's create page
  // (SB-07), e.g. Upload File or Edit File. A `:name` segment matches
  // any one segment: `/documents/:id/edit`.
  forms?: ReadonlyArray<{ label: string; path: string }>;
}

const icon = (Icon: typeof Home): ReactNode => <Icon className="h-4 w-4" />;
const planned = (id: string, label: string, ticket: string): MenuNode => ({
  id,
  label,
  planned: ticket,
});

// "More" collects our extra screens; it is a group, not a module.
export const MORE_GROUP_ID = 'more';

export const classicMenu: MenuNode[] = [
  { id: 'dashboard', label: 'Dashboard', icon: icon(LayoutDashboard), href: '/' },
  {
    id: 'units',
    label: 'Units & Users',
    icon: icon(Home),
    // Classic routes (UNIT-10). Add Users, Approved Users and Broadcast
    // show today's screens until UNIT-14, UNIT-12 and UNIT-09 rebuild them.
    children: [
      planned('units.unapproved', 'Unapproved Users', 'UNIT-13'),
      {
        id: 'units.add',
        label: 'Add Users',
        href: '/units/add-users',
        aliases: ['/units/import'],
        logs: ['unit', 'member'],
      },
      {
        id: 'units.approved',
        label: 'Approved Users',
        href: '/units/approved',
        aliases: ['/units'],
        logs: ['unit', 'member'],
      },
      planned('units.access', 'Access Control', 'UNIT-22'),
      { id: 'units.broadcast', label: 'Broadcast', href: '/units/broadcast', aliases: ['/notifications'] },
      planned('units.statistics', 'Statistics', 'UNIT-31'),
      planned('units.deactivated', 'De-Activated Users', 'UNIT-18'),
      planned('units.survey', 'Survey', 'P9'),
      planned('units.pets', 'Pet Setup', 'UNIT-35'),
      planned('units.consent', 'Consent Activity', 'P9'),
      planned('units.reports', 'Reports', 'REP-04'),
      // Ours, after their children: people list, resident tags, KYC queue.
      { id: 'units.directory', label: 'Member Directory', href: '/units/directory', logs: ['member'] },
      { id: 'units.categories', label: 'Member Categories', href: '/setup/categories' },
      // Block master (SB-10): add, rename and order blocks.
      { id: 'units.blocks', label: 'Blocks', href: '/units/blocks', logs: ['unit-blocks'] },
      { id: 'units.kyc', label: 'KYC Verification', href: '/setup/kyc' },
    ],
  },
  {
    id: 'helpdesk',
    label: 'HelpDesk Tracker',
    icon: icon(TicketCheck),
    // HELP-11. Create Request is a page of its own (HELP-13); Close goes
    // to Open Requests, where the desk works. Today's /tickets list stays
    // inside the module.
    create: { label: 'Create Request', href: '/helpdesk/new' },
    close: '/helpdesk/open',
    aliases: ['/tickets'],
    children: [
      {
        id: 'helpdesk.setup',
        label: 'Setup',
        tabs: [
          { id: 'helpdesk.setup.categories', label: 'Setup Helpdesk Categories', href: '/helpdesk/setup/categories', logs: ['helpdesk'] },
          { ...planned('helpdesk.setup.service-date', 'Setup Preferred Service Date', 'HELP-16'), logs: ['helpdesk'] },
          { id: 'helpdesk.setup.notifications', label: 'Notification Alerts', href: '/helpdesk/setup/notifications', logs: ['helpdesk'] },
          { id: 'helpdesk.setup.auto-responses', label: 'Automated Responses', href: '/helpdesk/setup/auto-responses', logs: ['helpdesk'] },
        ],
      },
      { id: 'helpdesk.escalation', label: 'Escalation', href: '/helpdesk/escalation', logs: ['helpdesk'] },
      // Open Requests, Closed Requests: status as menu items (SB-05, HELP-12).
      ...statusMenuChildren('helpdesk', HELPDESK_BASE, HELPDESK_SCOPES, { logs: ['ticket'] }),
      planned('helpdesk.reports', 'Reports', 'HELP-21'),
    ],
  },
  {
    id: 'income',
    label: 'Income Tracker',
    icon: icon(IndianRupee),
    children: [
      {
        // INC-34: the Setup pages whose settings have shipped, each holding
        // the same card as /settings. The rest stay hidden until built.
        id: 'income.setup',
        label: 'Setup',
        tabs: [
          { id: 'income.setup.auto-invoicing', label: 'Auto Invoicing', href: '/income/setup/auto-invoicing', logs: ['tenant_settings'] },
          planned('income.setup.income-accounts', 'Income Accounts', 'INC-38'),
          planned('income.setup.utility-invoicing', 'Utility Invoicing', 'INC-34'),
          { id: 'income.setup.payment-gateway', label: 'Payment Gateway', href: '/income/setup/payment-gateway', logs: ['tenant_settings'] },
          { id: 'income.setup.customize-invoice', label: 'Customize Invoice', href: '/income/setup/customize-invoice', logs: ['tenant_settings'] },
          planned('income.setup.other', 'Other', 'INC-42'),
          planned('income.setup.gst', 'GST', 'INC-23'),
          planned('income.setup.notifications', 'Notifications', 'INC-30'),
          { id: 'income.setup.defaulters', label: 'Defaulters', href: '/income/setup/defaulters', logs: ['tenant_settings'] },
        ],
      },
      planned('income.track-units', 'Track Units', 'INC-37'),
      // INC-20 — the unit dues workbench; INC-35 gives it the classic
      // arrangement (opens empty until a block or a search is chosen).
      { id: 'income.member-income', label: 'Member Income', href: '/income/members', logs: ['invoice', 'receipt'] },
      {
        // Classic routes (INC-33) over today's two registers until INC-36
        // turns them into fetch boxes.
        id: 'income.registers',
        label: 'Receipts & Invoices',
        tabs: [
          {
            id: 'income.registers.receipts',
            label: 'Receipts',
            href: '/income/registers/receipts',
            aliases: ['/receipts'],
            logs: ['receipt'],
          },
          planned('income.registers.credit-notes', 'Credit Notes', 'INC-25'),
          {
            id: 'income.registers.invoices',
            label: 'Invoices',
            href: '/income/registers/invoices',
            aliases: ['/invoices'],
            logs: ['invoice'],
          },
          planned('income.registers.email-status', 'Email Status Monitor', 'INC-31'),
        ],
      },
      planned('income.defaulters', 'Defaulters', 'INC-29'),
      planned('income.non-member', 'Non Member Income', 'INC-46'),
      planned('income.reports', 'Reports', 'REP-04'),
    ],
  },
  {
    id: 'expense',
    label: 'Expense Tracker',
    icon: icon(ShoppingCart),
    children: [
      planned('expense.setup', 'Setup', 'EXP-20'),
      { id: 'expense.purchase-workflow', label: 'Purchase Workflow', href: '/purchases' },
      planned('expense.by-vendors', 'By Vendors', 'EXP-20'),
      planned('expense.by-date', 'By Date', 'EXP-20'),
      planned('expense.budget', 'Budget', 'EXP-20'),
      planned('expense.comparison', 'Expenses Comparison', 'EXP-20'),
      planned('expense.reports', 'Reports', 'REP-04'),
    ],
  },
  {
    id: 'bank',
    label: 'Bank & Cash',
    icon: icon(Landmark),
    children: [
      planned('bank.setup', 'Setup', 'BANK-06'),
      planned('bank.transfer', 'Transfer', 'BANK-06'),
      { id: 'bank.accounts', label: 'Bank & Cash Accounts', href: '/bank' },
      { id: 'bank.taxes', label: 'Taxes', href: '/tax' },
      planned('bank.fixed-deposits', 'Fixed Deposits', 'BANK-06'),
      planned('bank.reports', 'Reports', 'REP-04'),
    ],
  },
  {
    id: 'ledger',
    label: 'General Ledger',
    icon: icon(BookOpen),
    children: [
      { id: 'ledger.chart', label: 'Chart of Accounts', href: '/accounts' },
      planned('ledger.journal', 'Journal Entries', 'GL-10'),
      planned('ledger.query', 'Query', 'GL-09'),
      planned('ledger.trial-balance', 'Trial Balance', 'GL-09'),
      planned('ledger.statements', 'Financial Statements', 'GL-09'),
      planned('ledger.reports', 'Reports', 'REP-04'),
    ],
  },
  {
    id: 'utility',
    label: 'Utility Tracker',
    icon: icon(Gauge),
    // Meters, readings, bills and slab rates are tabs of one page until
    // UTIL-10 gives each its own route.
    href: '/utilities',
    children: [
      planned('utility.setup', 'Setup', 'UTIL-10'),
      planned('utility.flats', 'Track Utility Flats', 'UTIL-11'),
      planned('utility.income', 'Utility Income', 'UTIL-10'),
      planned('utility.bulk', 'Bulk Posting', 'UTIL-12'),
      planned('utility.registers', 'Receipts & Invoices', 'UTIL-12'),
      planned('utility.defaulters', 'Defaulters', 'UTIL-10'),
    ],
  },
  {
    id: 'gate',
    label: 'Gate & Visitors',
    icon: icon(ShieldCheck),
    children: [
      planned('gate.setup', 'Setup', 'GATE-10'),
      planned('gate.move', 'Move In/Out', 'GATE-10'),
      planned('gate.usage', 'Usage Summary', 'GATE-10'),
      {
        id: 'gate.investigator',
        label: 'Incident Investigator',
        tabs: [
          { id: 'gate.investigator.visitors', label: 'Visitors & Logs', href: '/gate' },
          { id: 'gate.investigator.panic', label: 'Panic Alerts', href: '/sos' },
        ],
      },
      planned('gate.reports', 'Reports', 'REP-04'),
    ],
  },
  {
    id: 'staff',
    label: 'Staff Manager',
    icon: icon(Users),
    // Employees, attendance and shifts are tabs of one page until
    // STAFF-10 gives each status its own route.
    href: '/staff',
    logs: ['staff'],
    children: [
      planned('staff.setup', 'Setup', 'STAFF-10'),
      planned('staff.active', 'Active', 'STAFF-10'),
      planned('staff.attendance', 'Attendance', 'STAFF-10'),
      planned('staff.temp', 'Temp', 'STAFF-10'),
      planned('staff.retired', 'Retired', 'STAFF-10'),
      planned('staff.blacklisted', 'Blacklisted', 'STAFF-10'),
      planned('staff.reports', 'Reports', 'REP-04'),
    ],
  },
  {
    id: 'move',
    label: 'Move In/Out Tracker',
    icon: icon(ArrowLeftRight),
    children: [
      planned('move.setup', 'Setup', 'MOVE-05'),
      // Today's approval queue, which also holds exit requests.
      { id: 'move.verify', label: 'Verify Move Ins', href: '/approvals' },
      planned('move.approved', 'Approved Move Ins', 'MOVE-06'),
      planned('move.owners', 'Approved Owners', 'MOVE-05'),
      planned('move.tenants', 'Approved Tenants', 'MOVE-05'),
      planned('move.noc', 'NOC Initiated', 'MOVE-05'),
      planned('move.deactivated', 'Deactivated', 'MOVE-05'),
    ],
  },
  {
    id: 'parking',
    label: 'Parking Manager',
    icon: icon(Car),
    children: [
      planned('parking.setup', 'Setup', 'PARK-06'),
      // Slots and vehicles are two tabs of one page until PARK-06.
      { id: 'parking.slots-vehicles', label: 'Slots & Vehicles', href: '/parking' },
      { id: 'parking.vehicle-approvals', label: 'Vehicle Approvals', href: '/approvals/vehicles' },
    ],
  },
  {
    id: 'amenity',
    label: 'Amenity & Event',
    icon: icon(CalendarCheck),
    children: [
      planned('amenity.setup', 'Setup', 'AMEN-10'),
      { id: 'amenity.amenity', label: 'Amenity', href: '/amenities', logs: ['amenity'] },
      { id: 'amenity.event', label: 'Event', href: '/events' },
      planned('amenity.reports', 'Reports', 'REP-04'),
    ],
  },
  {
    id: 'rules',
    label: 'Community Rules & Violations',
    icon: icon(Gavel),
    children: [
      planned('rules.setup', 'Rules & Violations Set Up', 'RULE-02'),
      planned('rules.open', 'Open Violations', 'RULE-03'),
      planned('rules.closed', 'Closed Violations', 'RULE-03'),
    ],
  },
  {
    id: 'forms',
    label: 'Community Forms',
    icon: icon(ClipboardList),
    children: [
      planned('forms.setup', 'Setup', 'FORM-02'),
      planned('forms.responses', 'Responses', 'FORM-05'),
      planned('forms.reports', 'Reports', 'REP-04'),
    ],
  },
  {
    id: 'projects',
    label: 'Projects & Meetings',
    icon: icon(ScrollText),
    children: [
      planned('projects.setup', 'SetUp', 'PROJ-22'),
      planned('projects.projects', 'Projects', 'P9'),
      { id: 'projects.meetings', label: 'Meetings', href: '/governance' },
      planned('projects.tasks', 'Tasks', 'PROJ-11'),
      planned('projects.reports', 'Reports', 'REP-04'),
    ],
  },
  {
    id: 'assets',
    label: 'Asset & Inventory',
    icon: icon(Wrench),
    children: [
      planned('assets.setup', 'Setup', 'ASSET-07'),
      { id: 'assets.assets', label: 'Assets', href: '/assets', logs: ['asset', 'amc_contract'] },
      { id: 'assets.inventory', label: 'Inventory', href: '/inventory' },
      planned('assets.reports', 'Reports', 'REP-04'),
    ],
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: icon(Megaphone),
    // One list for every state until ANN-10 adds the status routes.
    href: '/announcements',
    logs: ['announcement'],
    children: [
      planned('announcements.setup', 'Setup', 'ANN-10'),
      planned('announcements.awaiting', 'Awaiting Approval', 'ANN-10'),
      planned('announcements.active', 'Active', 'ANN-10'),
      planned('announcements.retired', 'Retired', 'ANN-10'),
    ],
  },
  {
    id: 'vendors',
    label: 'Vendor Master',
    icon: icon(Store),
    children: [
      { id: 'vendors.expense', label: 'Vendors For Expense', href: '/vendors', logs: ['vendor'] },
      {
        id: 'vendors.non-member',
        label: 'Vendors for Non Member Income',
        href: '/customers',
        logs: ['customer'],
      },
      planned('vendors.bulk', 'Bulk Posting', 'VEND-09'),
      planned('vendors.amcs', 'AMCs', 'VEND-06'),
    ],
  },
  {
    id: 'files',
    label: 'Admin Files',
    icon: icon(FolderOpen),
    // FILE-10: the two roots as sub-tabs, the unit roster (FILE-12) and
    // our posters (FILE-40). Upload and Edit are pages of their own.
    forms: [
      { label: 'Upload File', path: '/documents/upload' },
      { label: 'Edit File', path: '/documents/:id/edit' },
    ],
    children: [
      {
        id: 'files.common',
        label: 'Common Files',
        tabs: [
          {
            id: 'files.common.admin',
            label: 'Admin Documents',
            href: '/documents/common/admin',
            aliases: ['/documents'],
            logs: ['document'],
          },
          { id: 'files.common.residents', label: 'Resident Documents', href: '/documents/common/residents', logs: ['document'] },
        ],
      },
      { id: 'files.unit', label: 'Unit Specific Files', href: '/documents/units', logs: ['document'] },
      { id: 'files.platform', label: 'Platform Files', href: '/documents/platform' },
    ],
  },
  {
    id: 'profile',
    label: 'Society Profile',
    icon: icon(Building2),
    children: [
      planned('profile.home', 'Home', 'PROF-10'),
      planned('profile.images', 'Images', 'PROF-10'),
      planned('profile.location', 'Location', 'PROF-10'),
      planned('profile.agreement', 'User Agreement', 'P9'),
      planned('profile.downloads', 'Downloadable Files', 'PROF-10'),
      { id: 'profile.emergency', label: 'Emergency Contacts', href: '/directory' },
    ],
  },
  // Today's finance reports; REP-04 turns this into the numbered index.
  { id: 'reports', label: 'Admin Reports', icon: icon(BarChart3), href: '/reports' },
  {
    // Our screens with no place in their menu (decision D4).
    id: MORE_GROUP_ID,
    label: 'More',
    icon: icon(Ellipsis),
    children: [
      { id: 'more.kpi', label: 'KPI Command Center', href: '/kpi-dashboard' },
      { id: 'more.analytics', label: 'Analytics', href: '/analytics' },
      { id: 'more.payments', label: 'Online Payments', href: '/payments' },
      { id: 'more.reconcile', label: 'Reconcile Debtors', href: '/accounts/reconcile-debtors' },
      { id: 'more.patrol', label: 'Guard Patrol', href: '/patrol' },
      { id: 'more.cctv', label: 'CCTV', href: '/cctv' },
      { id: 'more.voting', label: 'Voting', href: '/voting' },
      { id: 'more.gas', label: 'Gas', href: '/gas' },
      { id: 'more.marketplace', label: 'Marketplace', href: '/marketplace' },
      { id: 'more.salaries', label: 'Salaries', href: '/staff/salaries' },
      { id: 'more.audit', label: 'Audit Trail', href: '/audit' },
      { id: 'more.settings', label: 'Settings', href: '/settings', logs: ['tenant_settings'] },
    ],
  },
];
