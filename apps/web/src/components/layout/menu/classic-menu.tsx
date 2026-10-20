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
import { reportsMenuNode } from '@/components/reports/module-reports';
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

// Expense Tracker records (EXP-20); `purchase` is what was logged before them.
const EXPENSE_LOGS = ['purchase_request', 'vendor_bill', 'vendor_payment', 'vendor_debit_note', 'purchase'];

// "More" collects our extra screens; it is a group, not a module.
export const MORE_GROUP_ID = 'more';

export const classicMenu: MenuNode[] = [
  { id: 'dashboard', label: 'Dashboard', icon: icon(LayoutDashboard), href: '/' },
  {
    id: 'units',
    label: 'Units & Users',
    icon: icon(Home),
    // Classic routes (UNIT-10). Broadcast shows today's screen until
    // UNIT-09 rebuilds it. Add Users is the typed grid (UNIT-14; today's
    // CSV import stays under it), Approved Users the master–detail page
    // (UNIT-12; /units stays inside it).
    children: [
      {
        // UNIT-13: self-signups waiting for a decision; Edit is a page.
        id: 'units.unapproved',
        label: 'Unapproved Users',
        href: '/units/unapproved',
        logs: ['tenant_onboarding'],
        forms: [
          { label: 'Edit Unapproved User', path: '/units/unapproved/:onboardingId/edit' },
          // UNIT-21
          { label: 'Edit Welcome Message', path: '/units/unapproved/approval-message' },
        ],
      },
      {
        id: 'units.add',
        label: 'Add Users',
        href: '/units/add-users',
        aliases: ['/units/import'],
        logs: ['unit', 'member'],
        // UNIT-20
        forms: [{ label: 'Customize Invite Email', path: '/units/add-users/invite-message' }],
      },
      {
        id: 'units.approved',
        label: 'Approved Users',
        href: '/units/approved',
        aliases: ['/units'],
        logs: ['unit', 'member'],
      },
      // UNIT-22 / UNIT-23: committee and office logins, their module switches.
      {
        id: 'units.access',
        label: 'Access Control',
        tabs: [
          { id: 'units.access.committee', label: 'Management Committee', href: '/units/access-control/committee' },
          { id: 'units.access.office', label: 'Office Staff', href: '/units/access-control/office-staff' },
          planned('units.access.caretakers', 'Care Taker / Unit Manager', 'UNIT-30'),
        ],
      },
      { id: 'units.broadcast', label: 'Broadcast', href: '/units/broadcast', aliases: ['/notifications'] },
      planned('units.statistics', 'Statistics', 'UNIT-31'),
      // UNIT-18: past members; Edit opens the resident record (Re-activate).
      { id: 'units.deactivated', label: 'De-Activated Users', href: '/units/deactivated', logs: ['member'] },
      planned('units.survey', 'Survey', 'P9'),
      planned('units.pets', 'Pet Setup', 'UNIT-35'),
      planned('units.consent', 'Consent Activity', 'P9'),
      reportsMenuNode('units', 'REP-06'),
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
          { id: 'helpdesk.setup.service-date', label: 'Setup Preferred Service Date', href: '/helpdesk/setup/service-date', logs: ['helpdesk'] },
          { id: 'helpdesk.setup.notifications', label: 'Notification Alerts', href: '/helpdesk/setup/notifications', logs: ['helpdesk'] },
          { id: 'helpdesk.setup.auto-responses', label: 'Automated Responses', href: '/helpdesk/setup/auto-responses', logs: ['helpdesk'] },
        ],
      },
      { id: 'helpdesk.escalation', label: 'Escalation', href: '/helpdesk/escalation', logs: ['helpdesk'] },
      // Open Requests, Closed Requests: status as menu items (SB-05, HELP-12).
      ...statusMenuChildren('helpdesk', HELPDESK_BASE, HELPDESK_SCOPES, { logs: ['ticket'] }),
      reportsMenuNode('helpdesk', 'HELP-21'),
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
          { id: 'income.setup.income-accounts', label: 'Income Accounts', href: '/income/setup/income-accounts', logs: ['ledger_account'] },
          { id: 'income.setup.utility-invoicing', label: 'Utility Invoicing', href: '/income/setup/utility-invoicing', logs: ['tenant_settings'] },
          { id: 'income.setup.payment-gateway', label: 'Payment Gateway', href: '/income/setup/payment-gateway', logs: ['tenant_settings'] },
          { id: 'income.setup.customize-invoice', label: 'Customize Invoice', href: '/income/setup/customize-invoice', logs: ['tenant_settings'] },
          { id: 'income.setup.other', label: 'Other', href: '/income/setup/other', logs: ['tenant_settings'] },
          { id: 'income.setup.gst', label: 'GST', href: '/income/setup/gst', logs: ['tenant_settings'] },
          { id: 'income.setup.notifications', label: 'Notifications', href: '/income/setup/notifications', logs: ['tenant_settings'] },
          { id: 'income.setup.defaulters', label: 'Defaulters', href: '/income/setup/defaulters', logs: ['tenant_settings'] },
        ],
      },
      {
        // INC-37 / INC-49 — billing inputs of every unit, and its unit types.
        id: 'income.track-units',
        label: 'Track Units',
        tabs: [
          { id: 'income.track-units.unit', label: 'Unit', href: '/income/units', logs: ['unit'] },
          { id: 'income.track-units.types', label: 'Unit Types', href: '/income/units/types', logs: ['unit_billing_category'] },
        ],
      },
      // INC-20 — the unit dues workbench; INC-35 gives it the classic
      // arrangement (opens empty until a block or a search is chosen).
      { id: 'income.member-income', label: 'Member Income', href: '/income/members', logs: ['invoice', 'receipt'] },
      {
        // INC-36 — fetch boxes in classic (SB-09); the routes keep today's
        // /receipts and /invoices screens in the standard layout.
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
          { id: 'income.registers.credit-notes', label: 'Credit Notes', href: '/income/registers/credit-notes', logs: ['receipt'] },
          {
            id: 'income.registers.invoices',
            label: 'Invoices',
            href: '/income/registers/invoices',
            aliases: ['/invoices'],
            logs: ['invoice'],
          },
          { id: 'income.registers.email-status', label: 'Email Status Monitor', href: '/income/registers/email-status', logs: ['billing-email-log'] },
        ],
      },
      // INC-29 — filter, pick and remind units with dues past due.
      { id: 'income.defaulters', label: 'Defaulters', href: '/income/defaulters', logs: ['invoice'] },
      planned('income.non-member', 'Non Member Income', 'INC-46'),
      reportsMenuNode('income', 'REP-04'),
    ],
  },
  {
    id: 'expense',
    label: 'Expense Tracker',
    icon: icon(ShoppingCart),
    // EXP-20: the module's seven children in their order. Create Request is
    // a page of its own on every page (EXP-08 / EXP-09); a request opens on
    // its own page (view, or edit while it is a draft). Show Logs reads each
    // screen's record types; `purchase` holds what was logged before EXP-20.
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
          {
            id: 'expense.setup.numbering',
            label: 'Numbering',
            href: '/expense-tracker/setup/numbering',
            logs: ['purchase_numbering', 'tenant_settings', 'purchase'],
          },
        ],
      },
      {
        id: 'expense.purchase-workflow',
        label: 'Purchase Workflow',
        // Today's /purchases (bills, payments) stays inside the module.
        aliases: ['/purchases'],
        logs: EXPENSE_LOGS,
        tabs: [
          { id: 'expense.purchase-workflow.open', label: 'Open Purchase Request', href: '/expense-tracker/purchase-workflow/open', logs: ['purchase_request', 'purchase'] },
          { id: 'expense.purchase-workflow.closed', label: 'Closed Purchase Request', href: '/expense-tracker/purchase-workflow/closed', logs: ['purchase_request', 'purchase'] },
        ],
      },
      {
        // EXP-12 / EXP-14 / EXP-15 / EXP-16: the vendor-first desk. A vendor's
        // statement (/expense-tracker/by-vendors/:id/statement) stays inside it.
        id: 'expense.by-vendors',
        label: 'By Vendors',
        aliases: ['/expense-tracker/by-vendors'],
        logs: ['vendor_bill', 'vendor_payment', 'vendor_debit_note', 'purchase'],
        forms: [
          { label: 'Post Invoice', path: '/expense-tracker/by-vendors/:vendorId/invoice' },
          { label: 'Payment', path: '/expense-tracker/by-vendors/:vendorId/payment' },
        ],
        tabs: [
          {
            id: 'expense.by-vendors.subledgers',
            label: 'SubLedgers',
            href: '/expense-tracker/by-vendors/subledgers',
            logs: ['vendor_bill', 'vendor_payment', 'vendor_debit_note', 'vendor_allocation', 'vendor', 'purchase'],
          },
          planned('expense.by-vendors.bulk-posting', 'Bulk Posting', 'EXP-26'),
        ],
      },
      { id: 'expense.by-date', label: 'By Date', href: '/expense-tracker/by-date', logs: ['vendor_payment', 'purchase'] },
      // EXP-22: the year's budget per head; its setup grid is a page under it.
      { id: 'expense.budget', label: 'Budget', href: '/expense-tracker/budget', logs: ['expense_budget'] },
      // EXP-25: expense by head for a period, as a pie and a table.
      { id: 'expense.comparison', label: 'Expenses Comparison', href: '/expense-tracker/expenses-comparison' },
      reportsMenuNode('expense', 'REP-04'),
    ],
  },
  {
    id: 'bank',
    label: 'Bank & Cash',
    icon: icon(Landmark),
    // BANK-06. Today's /bank (all tabs) stays inside the module; Close goes
    // to the accounts register, where the desk works (Setup is BANK-17).
    aliases: ['/bank'],
    close: '/bank-cash/accounts',
    children: [
      planned('bank.setup', 'Setup', 'BANK-17'),
      { id: 'bank.transfer', label: 'Transfer', href: '/bank-cash/transfer', logs: ['bank_transfer'] },
      {
        id: 'bank.accounts',
        label: 'Bank & Cash Accounts',
        tabs: [
          { id: 'bank.accounts.register', label: 'Register', href: '/bank-cash/accounts', logs: ['bank_account', 'bank_reconciliation'] },
          { id: 'bank.accounts.cheques', label: 'Cheques', href: '/bank-cash/accounts/cheques', logs: ['bank_cheque'] },
          { id: 'bank.accounts.statement-import', label: 'Statement Import', href: '/bank-cash/accounts/statement-import', logs: ['bank_reconciliation'] },
          { id: 'bank.accounts.new', label: 'Add account', href: '/bank-cash/accounts/new', logs: ['bank_account'] },
        ],
      },
      // The four tax registers are BANK-15; today's tax screen meanwhile.
      { id: 'bank.taxes', label: 'Taxes', href: '/tax' },
      {
        id: 'bank.fixed-deposits',
        label: 'Fixed Deposits',
        tabs: [
          { id: 'bank.fixed-deposits.active', label: 'Active Fixed Deposits', href: '/bank-cash/fixed-deposits/active', logs: ['fixed_deposit'] },
          { id: 'bank.fixed-deposits.archived', label: 'Archived Fixed Deposits', href: '/bank-cash/fixed-deposits/archived', logs: ['fixed_deposit'] },
        ],
      },
      reportsMenuNode('bank', 'REP-06'),
    ],
  },
  {
    id: 'ledger',
    label: 'General Ledger',
    icon: icon(BookOpen),
    // GL-09: the six children as classic routes. Today's /accounts (tree,
    // dialogs, Tally import) stays inside Chart of Accounts. Create Journal
    // Entry is a page of its own (GL-11), offered on every page.
    create: { label: 'Create Journal Entry', href: '/general-ledger/journal-entries/create' },
    children: [
      {
        id: 'ledger.chart',
        label: 'Chart of Accounts',
        aliases: ['/accounts'],
        tabs: [
          { id: 'ledger.chart.assets', label: 'Assets', href: '/general-ledger/chart-of-accounts/assets', logs: ['ledger_account'] },
          { id: 'ledger.chart.liabilities', label: 'Liabilities', href: '/general-ledger/chart-of-accounts/liabilities', logs: ['ledger_account'] },
          { id: 'ledger.chart.income', label: 'Income', href: '/general-ledger/chart-of-accounts/income', logs: ['ledger_account'] },
          { id: 'ledger.chart.expense', label: 'Expense', href: '/general-ledger/chart-of-accounts/expense', logs: ['ledger_account'] },
          { id: 'ledger.chart.groups', label: 'Groups', href: '/general-ledger/chart-of-accounts/groups', logs: ['account_group'] },
        ],
      },
      {
        id: 'ledger.journal',
        label: 'Journal Entries',
        // An entry's own page (/general-ledger/journal-entries/<id>) stays here.
        aliases: ['/general-ledger/journal-entries'],
        tabs: [
          { id: 'ledger.journal.create', label: 'Create Journal Entry', href: '/general-ledger/journal-entries/create', logs: ['journal_entry'] },
          { id: 'ledger.journal.old', label: 'Old Journal Entries', href: '/general-ledger/journal-entries/old', logs: ['journal_entry'] },
          {
            id: 'ledger.journal.bulk-posting',
            label: 'Bulk Posting',
            href: '/general-ledger/journal-entries/bulk-posting',
            logs: ['ledger_account', 'journal_entry', 'financial_year'],
          },
          planned('ledger.journal.bulk-corrections', 'Bulk Corrections', 'GL-25'),
        ],
      },
      {
        id: 'ledger.query',
        label: 'Query',
        tabs: [
          { id: 'ledger.query.by-group', label: 'By Account Group', href: '/general-ledger/query/by-group' },
          planned('ledger.query.by-user', 'By User', 'GL-17'),
        ],
      },
      { id: 'ledger.trial-balance', label: 'Trial Balance', href: '/general-ledger/trial-balance', logs: ['financial_year'] },
      { id: 'ledger.statements', label: 'Financial Statements', href: '/general-ledger/financial-statements' },
      // REP-04's module Reports page (/accounts/reports).
      reportsMenuNode('ledger', 'REP-04'),
    ],
  },
  {
    id: 'utility',
    label: 'Utility Tracker',
    icon: icon(Gauge),
    // UTIL-10: six children. Our meter register, readings, bills and
    // trends are sub-tabs of Track Utility Flats (decision default); the
    // standard /utilities page with its tabs stays as it is.
    aliases: ['/utilities'],
    children: [
      {
        id: 'utility.setup',
        label: 'Setup',
        href: '/utilities/setup',
        forms: [
          { label: 'Edit Simple Interest', path: '/utilities/setup/interest' },
          { label: 'Add Meter Rule', path: '/utilities/setup/rules/new' },
          { label: 'Edit Meter Rule', path: '/utilities/setup/rules/:ruleId/edit' },
        ],
      },
      {
        id: 'utility.flats',
        label: 'Track Utility Flats',
        tabs: [
          { id: 'utility.flats.units', label: 'Utility Flats', href: '/utilities/flats', logs: ['unit'] },
          { id: 'utility.flats.meters', label: 'Meters', href: '/utilities/flats/meters', logs: ['utility'] },
          { id: 'utility.flats.readings', label: 'Readings', href: '/utilities/flats/readings', logs: ['utility'] },
          { id: 'utility.flats.bills', label: 'Bills', href: '/utilities/flats/bills', logs: ['utility', 'invoice'] },
          { id: 'utility.flats.trends', label: 'Trends', href: '/utilities/flats/trends' },
        ],
      },
      { id: 'utility.income', label: 'Utility Income', href: '/utilities/income', logs: ['invoice', 'receipt'] },
      {
        id: 'utility.bulk',
        label: 'Bulk Posting',
        href: '/utilities/bulk-posting',
        forms: [{ label: 'Invoices in Batch', path: '/utilities/bulk-posting/bills' }],
      },
      {
        id: 'utility.registers',
        label: 'Receipts & Invoices',
        tabs: [
          { id: 'utility.registers.receipts', label: 'Receipts', href: '/utilities/registers/receipts', logs: ['receipt'] },
          { id: 'utility.registers.invoices', label: 'Invoices', href: '/utilities/registers/invoices', logs: ['invoice'] },
          { id: 'utility.registers.credit-notes', label: 'Credit Notes', href: '/utilities/registers/credit-notes', logs: ['credit_note'] },
        ],
      },
      { id: 'utility.defaulters', label: 'Defaulters', href: '/utilities/defaulters', logs: ['invoice', 'tenant_settings'] },
    ],
  },
  {
    id: 'gate',
    label: 'Gate & Visitors',
    icon: icon(ShieldCheck),
    // GATE-10: the gate registers under Incident Investigator (our Staff
    // Logs, Parcels and Overstays after theirs, GATE-D2). Today's /gate
    // stays inside the module as Visitors. GATE-20: Setup holds the gates
    // grid; Close goes back to the Visitors register.
    close: '/gate/investigator/visitors',
    children: [
      { id: 'gate.setup', label: 'Setup', href: '/gate/setup', logs: ['gate'] },
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
          { id: 'gate.investigator.incidents', label: 'Incidents', href: '/gate/investigator/incidents', logs: ['gate'] },
          { id: 'gate.investigator.vehicles', label: 'Vehicle Logs', href: '/gate/investigator/vehicles' },
          { id: 'gate.investigator.staff-logs', label: 'Staff Logs', href: '/gate/investigator/staff-logs', logs: ['gate'] },
          { id: 'gate.investigator.parcels', label: 'Parcels', href: '/gate/investigator/parcels', logs: ['gate'] },
          { id: 'gate.investigator.overstays', label: 'Overstays', href: '/gate/investigator/overstays', logs: ['gate'] },
        ],
      },
      reportsMenuNode('gate', 'GATE-30'),
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
      reportsMenuNode('staff', 'STAFF-30'),
    ],
  },
  {
    id: 'move',
    label: 'Move In/Out Tracker',
    icon: icon(ArrowLeftRight),
    // MOVE-05: the module's routes under /move-in-out; each child shows
    // once its ticket ships. Close goes to Verify Move Ins.
    close: '/move-in-out/verify',
    children: [
      {
        id: 'move.setup',
        label: 'Setup',
        tabs: [
          { id: 'move.setup.verifiers', label: 'Verifiers', href: '/move-in-out/setup/verifiers', logs: ['tenant_settings'] },
          { id: 'move.setup.move-in-checklist', label: 'Move In CheckList', href: '/move-in-out/setup/move-in-checklist', logs: ['move_checklist'] },
          { id: 'move.setup.move-out-checklist', label: 'Move Out CheckList', href: '/move-in-out/setup/move-out-checklist', logs: ['move_checklist'] },
          planned('move.setup.move-in-fields', 'Custom Fields For Move-in', 'MOVE-14'),
          planned('move.setup.move-out-fields', 'Custom Fields For Move-out', 'MOVE-14'),
        ],
      },
      { id: 'move.verify', label: 'Verify Move Ins', href: '/move-in-out/verify' },
      { id: 'move.approved', label: 'Approved Move Ins', href: '/move-in-out/approved-move-ins' },
      // MOVE-08 / MOVE-11: the registers; a row's Edit is the resident record.
      {
        id: 'move.owners',
        label: 'Approved Owners',
        href: '/move-in-out/owners',
        logs: ['member'],
        forms: [{ label: 'Resident Record', path: '/move-in-out/residents/:memberId' }],
      },
      {
        id: 'move.tenants',
        label: 'Approved Tenants',
        tabs: [
          { id: 'move.tenants.all', label: 'Approved Tenants', href: '/move-in-out/tenants' },
          { id: 'move.tenants.ending', label: 'Agreement Ending This Month', href: '/move-in-out/tenants/ending-this-month' },
          { id: 'move.tenants.ended', label: 'Agreement Ended', href: '/move-in-out/tenants/ended' },
          { id: 'move.tenants.none', label: 'No Agreement Filled', href: '/move-in-out/tenants/no-agreement' },
        ],
      },
      planned('move.noc', 'NOC Initiated', 'MOVE-18'),
      { id: 'move.deactivated', label: 'Deactivated', href: '/move-in-out/deactivated', logs: ['member'] },
    ],
  },
  {
    id: 'parking',
    label: 'Parking Manager',
    icon: icon(Car),
    // PARK-06: Setup · Slots · Vehicles, our Sublets and the approval
    // queue as sub-tabs (PARK-D5). Today's /parking stays inside the module.
    aliases: ['/parking'],
    children: [
      // PARK-10: resident add / edit switches and the extra field's name.
      { id: 'parking.setup', label: 'Setup', href: '/parking/setup', logs: ['tenant_settings'] },
      {
        id: 'parking.slots',
        label: 'Slots',
        tabs: [
          { id: 'parking.slots.list', label: 'Slots', href: '/parking/slots' },
          { id: 'parking.slots.sublets', label: 'Sublets', href: '/parking/slots/sublets' },
        ],
      },
      {
        id: 'parking.vehicles',
        label: 'Vehicles',
        tabs: [
          { id: 'parking.vehicles.all', label: 'All Vehicles', href: '/parking/vehicles' },
          { id: 'parking.vehicles.awaiting', label: 'Awaiting Approval', href: '/approvals/vehicles' },
          planned('parking.vehicles.bulk', 'Bulk Upload', 'PARK-11'),
        ],
      },
    ],
  },
  {
    id: 'amenity',
    label: 'Amenity & Event',
    icon: icon(CalendarCheck),
    // AMEN-10: Reserve Amenity on every page; the amenity and booking forms
    // are pages. Today's /amenities tabs stay inside the module.
    create: { label: 'Reserve Amenity', href: '/amenities/reserve' },
    forms: [
      { label: 'Add Amenity', path: '/amenities/new' },
      { label: 'Edit Amenity', path: '/amenities/:amenityId/edit' },
      // AMEN-12: the event form as a page.
      { label: 'Add Event', path: '/amenities/events/new' },
      { label: 'Edit Event', path: '/amenities/events/:eventId/edit' },
    ],
    children: [
      {
        id: 'amenity.setup',
        label: 'Setup',
        tabs: [
          { id: 'amenity.setup.amenity', label: 'Amenity', href: '/amenities/setup', logs: ['amenity'] },
          { id: 'amenity.setup.event', label: 'Event', href: '/amenities/setup/events', logs: ['event'] },
          planned('amenity.setup.restrictions', 'Restrictions', 'AMEN-41'),
        ],
      },
      {
        id: 'amenity.amenity',
        label: 'Amenity',
        aliases: ['/amenities'],
        tabs: [
          { id: 'amenity.reservations', label: 'Amenity Reservations', href: '/amenities/reservations', logs: ['amenity'] },
          { id: 'amenity.calendar', label: 'Reservations Calendar', href: '/amenities/calendar', logs: ['amenity'] },
        ],
      },
      { id: 'amenity.event', label: 'Event', href: '/events' },
      reportsMenuNode('amenity', 'AMEN-30'),
    ],
  },
  {
    id: 'rules',
    label: 'Community Rules & Violations',
    icon: icon(Gavel),
    // RULE-02: the category form is a page (SB-07).
    forms: [
      { label: 'Create Category', path: '/violations/setup/categories/new' },
      { label: 'Edit Category', path: '/violations/setup/categories/:id' },
    ],
    children: [
      {
        id: 'rules.setup',
        label: 'Rules & Violations Set Up',
        tabs: [
          planned('rules.setup.approvers', 'Approvers Set Up', 'RULE-05'),
          { id: 'rules.setup.categories', label: 'Category Set Up', href: '/violations/setup/categories', logs: ['violation_category'] },
        ],
      },
      planned('rules.open', 'Open Violations', 'RULE-05'),
      planned('rules.closed', 'Closed Violations', 'RULE-05'),
    ],
  },
  {
    id: 'forms',
    label: 'Community Forms',
    icon: icon(ClipboardList),
    children: [
      planned('forms.setup', 'Setup', 'FORM-02'),
      planned('forms.responses', 'Responses', 'FORM-05'),
      reportsMenuNode('forms', 'REP-04'),
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
      // PROJ-22: Setup Task Categories; Access Control comes with PROJ-47.
      { id: 'projects.setup', label: 'SetUp', href: '/governance/setup', logs: ['meeting'] },
      planned('projects.projects', 'Projects', 'PROJ-41'),
      {
        id: 'projects.meetings',
        label: 'Meetings',
        aliases: ['/governance'],
        // Open, Closed: state as sub-tabs (SB-05).
        tabs: statusMenuChildren('projects.meetings', MEETINGS_BASE, MEETING_STATES, { logs: ['meeting'] }),
      },
      { id: 'projects.tasks', label: 'Tasks', href: '/governance/tasks', logs: ['meeting_task'] },
      reportsMenuNode('projects', 'PROJ-30'),
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
          { id: 'assets.inventory.expired', label: 'Expired', href: '/asset-inventory/inventory/expired', logs: INVENTORY_LOGS },
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
      reportsMenuNode('assets', 'ASSET-14'),
    ],
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: icon(Megaphone),
    // ANN-10: the states are the menu; Create Announcement is a page of its
    // own (SB-07) and Close goes to Active, where the notices are. Today's
    // /announcements list and one notice's page stay inside the module.
    create: { label: 'Create Announcement', href: '/announcements/new' },
    close: '/announcements/active',
    aliases: ['/announcements'],
    forms: [{ label: 'View Announcement', path: '/announcements/:id' }],
    children: [
      { id: 'announcements.setup', label: 'Setup', href: '/announcements/setup', logs: ['announcement'] },
      {
        id: 'announcements.awaiting-approval',
        label: 'Awaiting Approval',
        href: '/announcements/awaiting-approval',
        logs: ['announcement'],
      },
      { id: 'announcements.active', label: 'Active', href: '/announcements/active', logs: ['announcement'] },
      // Their Retired list has no Show Logs.
      { id: 'announcements.retired', label: 'Retired', href: '/announcements/retired' },
    ],
  },
  {
    id: 'vendors',
    label: 'Vendor Master',
    icon: icon(Store),
    // VEND-06 / VEND-07. Both lists Active / In-Active; the vendor form is
    // a page (the income list's saves to customers, decision D5).
    forms: [
      { label: 'Add Vendor', path: '/vendor-master/vendors/new' },
      { label: 'Edit Vendor', path: '/vendor-master/vendors/:id/edit' },
    ],
    children: [
      {
        id: 'vendors.expense',
        label: 'Vendors For Expense',
        aliases: ['/vendors'],
        logs: ['vendor'],
        tabs: [
          { id: 'vendors.expense.active', label: 'Active', href: '/vendor-master/expense', logs: ['vendor'] },
          { id: 'vendors.expense.inactive', label: 'In-Active', href: '/vendor-master/expense/inactive', logs: ['vendor'] },
        ],
      },
      {
        id: 'vendors.non-member',
        label: 'Vendors for Non Member Income',
        aliases: ['/customers'],
        logs: ['customer'],
        tabs: [
          { id: 'vendors.non-member.active', label: 'Active', href: '/vendor-master/non-member-income', logs: ['customer'] },
          {
            id: 'vendors.non-member.inactive',
            label: 'In-Active',
            href: '/vendor-master/non-member-income/inactive',
            logs: ['customer'],
          },
        ],
      },
      planned('vendors.bulk', 'Bulk Posting', 'VEND-09'),
      planned('vendors.amcs', 'AMCs', 'VEND-11'),
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
      { id: 'profile.home', label: 'Home', href: '/society-profile/home', logs: PROFILE_LOGS },
      { id: 'profile.images', label: 'Images', href: '/society-profile/images', logs: PROFILE_LOGS },
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
  // The numbered index of every report (REP-04); today's /reports shows it too.
  { id: 'reports', label: 'Admin Reports', icon: icon(BarChart3), href: '/admin-reports', aliases: ['/reports'] },
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
      // Every approval request (purchases, exits, move-ins …); Move In/Out has its own queues.
      { id: 'more.approvals', label: 'Approvals', href: '/approvals' },
      { id: 'more.audit', label: 'Audit Trail', href: '/audit' },
      { id: 'more.settings', label: 'Settings', href: '/settings', logs: ['tenant_settings'] },
    ],
  },
];
