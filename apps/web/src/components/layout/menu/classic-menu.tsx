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
import { STAFF_ACTIVE, STAFF_BASE, STAFF_RETIRED } from '@/lib/staff-statuses';
import { ASSET_STATUS_ROUTES, ASSETS_BASE } from '@/lib/asset-statuses';
import { MEETING_STATES, MEETINGS_BASE } from '@/lib/meeting-states';
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

// Society Profile's activity log: society settings, help and contact,
// emergency numbers and the downloadable files (PROF-S8).
const PROFILE_LOGS = ['tenant_settings', 'tenant-setting', 'tenant', 'directory', 'document'];

// The stock book's log: items, movements and today's procurement writes.
const INVENTORY_LOGS = ['material', 'stock_movement', 'inventory'];

// "More" collects our extra screens; it is a group, not a module.
export const MORE_GROUP_ID = 'more';

export const classicMenu: MenuNode[] = [
  { id: 'dashboard', label: 'Dashboard', icon: icon(LayoutDashboard), href: '/' },
  {
    id: 'units',
    label: 'Units & Users',
    icon: icon(Home),
    // Classic routes (UNIT-10). Add Users and Broadcast show today's
    // screens until UNIT-14 and UNIT-09 rebuild them. Approved Users is the
    // master–detail page (UNIT-12); /units stays inside it.
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
          {
            id: 'income.setup.auto-invoicing',
            label: 'Auto Invoicing',
            href: '/income/setup/auto-invoicing',
            logs: ['tenant_settings', 'billing_settings', 'billing_rule_line', 'unit_billing_category'],
          },
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
    // EXP-08 / EXP-09: Create Request is a page of its own; a request opens
    // on its own page (view, or edit while it is a draft).
    create: { label: 'Create Request', href: '/expense-tracker/purchase-workflow/new' },
    forms: [{ label: 'Purchase Request', path: '/expense-tracker/purchase-workflow/:id' }],
    children: [
      {
        id: 'expense.setup',
        label: 'Setup',
        tabs: [
          { id: 'expense.setup.heads', label: 'Expense Heads', href: '/expense-tracker/setup/expense-heads', logs: ['ledger_account'] },
          {
            id: 'expense.setup.purchase-request',
            label: 'Purchase Request',
            href: '/expense-tracker/setup/purchase-request',
            logs: ['approvals', 'tenant'],
          },
          planned('expense.setup.numbering', 'Numbering', 'EXP-18'),
        ],
      },
      {
        id: 'expense.purchase-workflow',
        label: 'Purchase Workflow',
        // Today's /purchases (bills, payments) stays inside the module.
        aliases: ['/purchases'],
        tabs: [
          { id: 'expense.purchase-workflow.open', label: 'Open Purchase Request', href: '/expense-tracker/purchase-workflow/open', logs: ['purchase'] },
          { id: 'expense.purchase-workflow.closed', label: 'Closed Purchase Request', href: '/expense-tracker/purchase-workflow/closed', logs: ['purchase'] },
        ],
      },
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
    // GATE-10: the gate registers under Incident Investigator (our Staff
    // Logs, Parcels and Overstays after theirs, GATE-D2). Today's /gate
    // stays inside the module as Visitors.
    children: [
      planned('gate.setup', 'Setup', 'GATE-40'),
      planned('gate.move', 'Move In/Out', 'GATE-45'),
      planned('gate.usage', 'Usage Summary', 'GATE-44'),
      {
        id: 'gate.investigator',
        label: 'Incident Investigator',
        tabs: [
          {
            id: 'gate.investigator.visitors',
            label: 'Visitors',
            href: '/gate/investigator/visitors',
            aliases: ['/gate'],
            logs: ['gate'],
          },
          // GATE-11: alerts as a table; the live SOS console is under More.
          { id: 'gate.investigator.panic', label: 'Panic Alerts', href: '/gate/investigator/panic-alerts', logs: ['safety'] },
          planned('gate.investigator.incidents', 'Incidents', 'GATE-42'),
          { id: 'gate.investigator.vehicles', label: 'Vehicle Logs', href: '/gate/investigator/vehicles' },
          { id: 'gate.investigator.staff-logs', label: 'Staff Logs', href: '/gate/investigator/staff-logs', logs: ['gate'] },
          { id: 'gate.investigator.parcels', label: 'Parcels', href: '/gate/investigator/parcels', logs: ['gate'] },
          { id: 'gate.investigator.overstays', label: 'Overstays', href: '/gate/investigator/overstays', logs: ['gate'] },
        ],
      },
      planned('gate.reports', 'Reports', 'GATE-30'),
    ],
  },
  {
    id: 'staff',
    label: 'Staff Manager',
    icon: icon(Users),
    // STAFF-10: status lists as menu items (SB-05), Add Staff as a page
    // (SB-07). Today's /staff stays inside the module.
    create: { label: 'Add Staff', href: '/staff/new' },
    close: '/staff/active',
    aliases: ['/staff'],
    logs: ['staff'],
    children: [
      { id: 'staff.setup', label: 'Setup', href: '/staff/setup', logs: ['staff'] },
      ...statusMenuChildren('staff', STAFF_BASE, [STAFF_ACTIVE], { logs: ['staff'] }),
      { id: 'staff.attendance', label: 'Attendance', href: '/staff/attendance', logs: ['staff'] },
      planned('staff.temp', 'Temp', 'STAFF-40'),
      ...statusMenuChildren('staff', STAFF_BASE, [STAFF_RETIRED], { logs: ['staff'] }),
      planned('staff.blacklisted', 'Blacklisted', 'STAFF-40'),
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
    // PROJ-10 to PROJ-12. Create Meeting on every page; meetings and their
    // minutes are pages of their own. Today's /governance stays inside.
    create: { label: 'Create Meeting', href: '/governance/meetings/new' },
    forms: [
      { label: 'Edit Meeting', path: '/governance/meetings/:id/edit' },
      { label: 'Meeting Minutes', path: '/governance/meetings/:id/minutes' },
    ],
    children: [
      planned('projects.setup', 'SetUp', 'PROJ-22'),
      planned('projects.projects', 'Projects', 'PROJ-41'),
      {
        id: 'projects.meetings',
        label: 'Meetings',
        aliases: ['/governance'],
        // Open, Closed: state as sub-tabs (SB-05).
        tabs: statusMenuChildren('projects.meetings', MEETINGS_BASE, MEETING_STATES, { logs: ['meeting'] }),
      },
      { id: 'projects.tasks', label: 'Tasks', href: '/governance/tasks', logs: ['meeting_task'] },
      planned('projects.reports', 'Reports', 'PROJ-30'),
    ],
  },
  {
    id: 'assets',
    label: 'Asset & Inventory',
    icon: icon(Wrench),
    // ASSET-07 to ASSET-10. Assets by status, the stock book, Add / Edit
    // Asset as pages; today's maintenance tabs live under More.
    close: '/asset-inventory/assets/active',
    forms: [
      { label: 'Add Asset', path: '/asset-inventory/assets/new' },
      { label: 'Edit Asset', path: '/asset-inventory/assets/:id' },
    ],
    children: [
      {
        id: 'assets.setup',
        label: 'Setup',
        tabs: [
          { id: 'assets.setup.asset-categories', label: 'Setup Asset Categories', href: '/asset-inventory/setup/asset-categories' },
          planned('assets.setup.inventory-categories', 'Setup Inventory Categories', 'ASSET-17'),
        ],
      },
      {
        id: 'assets.assets',
        label: 'Assets',
        create: { label: 'Add Asset', href: '/asset-inventory/assets/new' },
        aliases: ['/asset-inventory/assets'],
        tabs: [
          ...statusMenuChildren('assets.assets', ASSETS_BASE, ASSET_STATUS_ROUTES, { logs: ['asset', 'amc_contract'] }),
          planned('assets.assets.bulk', 'Bulk Upload', 'ASSET-15'),
          { id: 'assets.assets.edits', label: 'View User Edits', href: '/asset-inventory/assets/edits' },
        ],
      },
      {
        id: 'assets.inventory',
        label: 'Inventory',
        aliases: ['/asset-inventory/inventory'],
        tabs: [
          { id: 'assets.inventory.active', label: 'Active', href: '/asset-inventory/inventory/active', logs: INVENTORY_LOGS },
          planned('assets.inventory.bulk', 'Bulk Upload', 'ASSET-15'),
          planned('assets.inventory.expired', 'Expired', 'ASSET-12'),
          {
            id: 'assets.inventory.procurement',
            label: 'Procurement',
            href: '/asset-inventory/inventory/procurement',
            aliases: ['/inventory'],
            logs: ['inventory'],
          },
          { id: 'assets.inventory.movements', label: 'Movement Log', href: '/asset-inventory/inventory/movements', logs: INVENTORY_LOGS },
        ],
      },
      planned('assets.reports', 'Reports', 'ASSET-14'),
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
    // PROF-10: one activity log for the module (PROF-S8).
    children: [
      planned('profile.home', 'Home', 'PROF-21'),
      planned('profile.images', 'Images', 'PROF-22'),
      { id: 'profile.location', label: 'Location', href: '/society-profile/location', logs: PROFILE_LOGS },
      planned('profile.agreement', 'User Agreement', 'PROF-40'),
      { id: 'profile.downloads', label: 'Downloadable Files', href: '/society-profile/files', logs: PROFILE_LOGS },
      // Today's /directory (Emergency Desk and local listings) stays inside.
      {
        id: 'profile.emergency',
        label: 'Emergency Contacts',
        href: '/society-profile/emergency',
        aliases: ['/directory'],
        logs: PROFILE_LOGS,
      },
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
      { id: 'more.sos', label: 'SOS & Safety', href: '/sos' },
      // Today's AMC, service history, checklists and audits (ASSET-S16).
      { id: 'more.asset-maintenance', label: 'Asset Maintenance', href: '/assets', logs: ['asset', 'amc_contract'] },
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
