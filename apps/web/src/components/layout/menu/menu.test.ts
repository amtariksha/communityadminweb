import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSidebarAllowlist } from '@/lib/admin-roles';
import { classicMenu, type MenuNode } from './classic-menu';
import { standardMenu } from './standard-menu';
import {
  entryHref,
  gatingItem,
  governingItem,
  locate,
  menuAliases,
  menuHrefs,
  visibleMenu,
  type MenuAccess,
} from './menu-access';

// vitest runs from apps/web.
const DASHBOARD_ROUTES = join(process.cwd(), 'src', 'app', '(dashboard)');
const EVERYONE: MenuAccess = { roleAllowlist: null };

function routeExists(href: string): boolean {
  const path = href.split('?')[0];
  return existsSync(join(DASHBOARD_ROUTES, path, 'page.tsx'));
}

function find(nodes: readonly MenuNode[], id: string): MenuNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = find([...(node.children ?? []), ...(node.tabs ?? [])], id);
    if (nested) return nested;
  }
  return undefined;
}

describe('classic menu shape', () => {
  it('lists the 22 modules in the committee’s order, then More', () => {
    expect(classicMenu.map((node) => node.label)).toEqual([
      'Dashboard',
      'Units & Users',
      'HelpDesk Tracker',
      'Income Tracker',
      'Expense Tracker',
      'Bank & Cash',
      'General Ledger',
      'Utility Tracker',
      'Gate & Visitors',
      'Staff Manager',
      'Move In/Out Tracker',
      'Parking Manager',
      'Amenity & Event',
      'Community Rules & Violations',
      'Community Forms',
      'Projects & Meetings',
      'Asset & Inventory',
      'Announcements',
      'Vendor Master',
      'Admin Files',
      'Society Profile',
      'Admin Reports',
      'More',
    ]);
  });

  it('opens each route from one place only', () => {
    const hrefs = menuHrefs(classicMenu);
    expect(hrefs.filter((href, i) => hrefs.indexOf(href) !== i)).toEqual([]);
  });
});

describe('classic modules', () => {
  const menu = visibleMenu(classicMenu, EVERYONE);
  const labels = (id: string) => find(menu, id)?.children?.map((child) => child.label);

  it('Units & Users lists its built children in the committee’s order, then our extras', () => {
    expect(labels('units')).toEqual([
      'Unapproved Users',
      'Add Users',
      'Approved Users',
      'Access Control',
      'Broadcast',
      'De-Activated Users',
      'Reports',
      'Member Directory',
      'Member Categories',
      'Blocks',
      'KYC Verification',
    ]);
  });

  it('each Units & Users child opens its own classic route', () => {
    expect(find(menu, 'units')?.children?.slice(0, 5).map((child) => child.href ?? child.tabs?.[0]?.href)).toEqual([
      '/units/unapproved',
      '/units/add-users',
      '/units/approved',
      '/units/access-control/committee',
      '/units/broadcast',
    ]);
  });

  it('Income Tracker shows Setup and Receipts & Invoices with their sub-tabs', () => {
    expect(labels('income')).toEqual(['Setup', 'Track Units', 'Member Income', 'Receipts & Invoices', 'Defaulters', 'Non Member Income', 'Reports']);
    // INC-46: Non Member Income's By Vendors and By Date, shown with Customers; Bulk Posting stays planned.
    expect(find(menu, 'income.non-member')?.tabs?.map((tab) => [tab.label, tab.href])).toEqual([
      ['By Vendors', '/income/non-member'],
      ['By Date', '/income/non-member/by-date'],
    ]);
    expect(governingItem('/income/non-member/payers/p-1/statement')?.href).toBe('/customers');
    // INC-37: Track Units has the grid and the unit types, gated with Invoices.
    expect(find(menu, 'income.track-units')?.tabs?.map((tab) => [tab.label, tab.href])).toEqual([
      ['Unit', '/income/units'],
      ['Unit Types', '/income/units/types'],
    ]);
    expect(governingItem('/income/units/types')?.href).toBe('/invoices');
    expect(find(menu, 'income.member-income')?.href).toBe('/income/members');
    expect(find(menu, 'income.setup')?.tabs?.map((tab) => [tab.label, tab.href])).toEqual([
      ['Auto Invoicing', '/income/setup/auto-invoicing'],
      ['Income Accounts', '/income/setup/income-accounts'],
      ['Utility Invoicing', '/income/setup/utility-invoicing'],
      ['Payment Gateway', '/income/setup/payment-gateway'],
      ['Customize Invoice', '/income/setup/customize-invoice'],
      ['Other', '/income/setup/other'],
      ['GST', '/income/setup/gst'],
      ['Notifications', '/income/setup/notifications'],
      ['Defaulters', '/income/setup/defaulters'],
    ]);
    expect(entryHref(find(menu, 'income.setup') as MenuNode)).toBe('/income/setup/auto-invoicing');
    expect(governingItem('/income/setup/defaulters')?.href).toBe('/invoices');
    expect(governingItem('/income/setup/utility-invoicing')?.href).toBe('/invoices');
    expect(find(menu, 'income.registers')?.tabs?.map((tab) => [tab.label, tab.href])).toEqual([
      ['Receipts', '/income/registers/receipts'],
      ['Credit Notes', '/income/registers/credit-notes'],
      ['Invoices', '/income/registers/invoices'],
      ['Email Status Monitor', '/income/registers/email-status'],
    ]);
    // INC-36: the Credit Notes register follows the receipts entry.
    expect(governingItem('/income/registers/credit-notes')?.href).toBe('/receipts');
  });

  it('HelpDesk Tracker shows Setup with its built screens as sub-tabs, then the status lists', () => {
    expect(labels('helpdesk')).toEqual(['Setup', 'Escalation', 'Open Requests', 'Closed Requests', 'Reports']);
    expect(find(menu, 'helpdesk.escalation')?.href).toBe('/helpdesk/escalation');
    expect(find(menu, 'helpdesk.setup')?.tabs?.map((tab) => [tab.label, tab.href])).toEqual([
      ['Setup Helpdesk Categories', '/helpdesk/setup/categories'],
      ['Setup Preferred Service Date', '/helpdesk/setup/service-date'],
      ['Notification Alerts', '/helpdesk/setup/notifications'],
      ['Automated Responses', '/helpdesk/setup/auto-responses'],
    ]);
    expect(entryHref(find(menu, 'helpdesk.setup') as MenuNode)).toBe('/helpdesk/setup/categories');
  });

  it('Gate & Visitors opens Incident Investigator with the gate registers as sub-tabs', () => {
    expect(labels('gate')).toEqual(['Setup', 'Move In/Out', 'Usage Summary', 'Incident Investigator', 'Reports']);
    expect(find(menu, 'gate.setup')?.href).toBe('/gate/setup');
    expect(find(menu, 'gate')?.close).toBe('/gate/investigator/visitors');
    expect(find(menu, 'gate.investigator')?.tabs?.map((tab) => [tab.label, tab.href])).toEqual([
      ['Visitors', '/gate/investigator/visitors'],
      ['Panic Alerts', '/gate/investigator/panic-alerts'],
      ['Incidents', '/gate/investigator/incidents'],
      ['Vehicle Logs', '/gate/investigator/vehicles'],
      ['Staff Logs', '/gate/investigator/staff-logs'],
      ['Parcels', '/gate/investigator/parcels'],
      ['Overstays', '/gate/investigator/overstays'],
    ]);
    expect(governingItem('/gate/investigator/parcels')?.href).toBe('/gate');
    const withoutGate = visibleMenu(classicMenu, { roleAllowlist: null, enabledFeatures: ['invoices'] });
    // Panic Alerts follows SOS & Safety, which no feature switches off.
    expect(governingItem('/gate/investigator/panic-alerts')?.href).toBe('/sos');
    expect(find(withoutGate, 'gate.investigator')?.tabs?.map((tab) => tab.href)).toEqual(['/gate/investigator/panic-alerts']);
  });

  it('Staff Manager lists Setup, the status lists, Attendance and Reports; Add Staff is a page', () => {
    expect(find(menu, 'staff')?.children?.map((child) => [child.label, child.href])).toEqual([
      ['Setup', '/staff/setup'],
      ['Active', '/staff/active'],
      ['Attendance', '/staff/attendance'],
      ['Temp', '/staff/temp'],
      ['Retired', '/staff/retired'],
      ['Blacklisted', '/staff/blacklisted'],
      ['Reports', '/staff/reports'],
    ]);
    expect(find(menu, 'staff')?.create).toEqual({ label: 'Add Staff', href: '/staff/new' });
    expect(governingItem('/staff/retired')?.href).toBe('/staff');
  });

  it('Parking Manager shows Slots and Vehicles with our sub-tabs', () => {
    expect(labels('parking')).toEqual(['Setup', 'Slots', 'Vehicles']);
    expect(find(menu, 'parking.setup')?.href).toBe('/parking/setup');
    expect(find(menu, 'parking.slots')?.tabs?.map((tab) => [tab.label, tab.href])).toEqual([
      ['Slots', '/parking/slots'],
      ['Sublets', '/parking/slots/sublets'],
    ]);
    expect(find(menu, 'parking.vehicles')?.tabs?.map((tab) => [tab.label, tab.href])).toEqual([
      ['All Vehicles', '/parking/vehicles'],
      ['Awaiting Approval', '/approvals/vehicles'],
      // PARK-11
      ['Bulk Upload', '/parking/vehicles/bulk-upload'],
    ]);
    const withoutParking = visibleMenu(classicMenu, { roleAllowlist: null, enabledFeatures: ['invoices'] });
    expect(find(withoutParking, 'parking.slots')).toBeUndefined();
  });

  it('Move In/Out Tracker shows its built children, each a route (MOVE-05)', () => {
    expect(find(menu, 'move')?.children?.map((child) => [child.label, child.href ?? child.tabs?.[0]?.href])).toEqual([
      // MOVE-12: Setup opens on its first built tab.
      ['Setup', '/move-in-out/setup/verifiers'],
      ['Verify Move Ins', '/move-in-out/verify'],
      ['Approved Move Ins', '/move-in-out/approved-move-ins'],
      ['Approved Owners', '/move-in-out/owners'],
      ['Approved Tenants', '/move-in-out/tenants'],
      // MOVE-18: NOC Initiated · NOC Sent · NOC Submitted.
      ['NOC Initiated', '/move-in-out/noc'],
      ['Deactivated', '/move-in-out/deactivated'],
    ]);
    expect(find(menu, 'move.noc')?.tabs?.map((tab) => tab.href)).toEqual([
      '/move-in-out/noc', '/move-in-out/noc/sent', '/move-in-out/noc/submitted',
    ]);
    // The NOC lists are the standard layout's Move-Outs entry too.
    expect(governingItem('/move-in-out/noc/sent')?.href).toBe('/move-in-out/noc');
    expect(find(menu, 'move.tenants')?.tabs?.map((tab) => tab.label)).toEqual([
      'Approved Tenants', 'Agreement Ending This Month', 'Agreement Ended', 'No Agreement Filled',
    ]);
    expect(governingItem('/move-in-out/verify')?.href).toBe('/approvals');
    // MOVE-08..11: the registers and the resident record follow the member directory.
    expect(governingItem('/move-in-out/owners')?.href).toBe('/units/directory');
    expect(governingItem('/move-in-out/residents/m-1')?.href).toBe('/units/directory');
    // Every approval request stays reachable under More.
    expect(find(menu, 'more.approvals')?.href).toBe('/approvals');
  });

  it('HelpDesk screens follow the Tickets feature and supervisor visibility', () => {
    const withoutTickets = visibleMenu(classicMenu, { roleAllowlist: null, enabledFeatures: ['invoices'] });
    expect(find(withoutTickets, 'helpdesk')).toBeUndefined();
    expect(governingItem('/helpdesk/setup/categories')?.href).toBe('/tickets');
  });

  it('keeps no Invoices, Receipts or Customers entry at the top of Income Tracker', () => {
    expect(labels('income')).not.toEqual(expect.arrayContaining(['Invoices', 'Receipts', 'Customers']));
  });
});

describe('menus point only at screens that exist', () => {
  it.each([
    ['standard', standardMenu.flatMap((group) => group.items.map((item) => item.href))],
    ['classic', menuHrefs(classicMenu)],
  ])('every %s route has a page', (_label, hrefs) => {
    expect(hrefs.filter((href) => !routeExists(href))).toEqual([]);
  });

  it('every classic entry is gated by a standard entry, so the two menus agree', () => {
    const ungated = (nodes: readonly MenuNode[]): string[] =>
      nodes.flatMap((node) => [
        ...(node.href && !node.planned && !gatingItem(node) ? [node.href] : []),
        ...ungated([...(node.children ?? []), ...(node.tabs ?? [])]),
      ]);
    expect(ungated(classicMenu)).toEqual([]);
  });

  it('every alias is a real page too', () => {
    expect(menuAliases(classicMenu).filter((href) => !routeExists(href))).toEqual([]);
  });
});

describe('visibleMenu', () => {
  it('hides planned entries and modules with nothing built yet', () => {
    const menu = visibleMenu(classicMenu, EVERYONE);
    expect(find(menu, 'units.survey')).toBeUndefined();
    expect(find(menu, 'gate.move')?.href).toBe('/gate/move-in-out');
    expect(find(menu, 'gate.reports')?.href).toBe('/gate/reports');
    expect(find(menu, 'rules.setup.categories')?.href).toBe('/violations/setup/categories');
    expect(find(menu, 'forms')).toBeUndefined();
    expect(find(menu, 'helpdesk.open')?.href).toBe('/helpdesk/open');
  });

  it('turns a module whose children are all planned into a plain link', () => {
    const module: MenuNode = {
      id: 'sample',
      label: 'Sample',
      href: '/utilities',
      children: [{ id: 'sample.a', label: 'A', planned: 'X-1' }],
    };
    const [shown] = visibleMenu([module], EVERYONE);
    expect(shown?.href).toBe('/utilities');
    expect(shown?.children).toBeUndefined();
  });

  it('shows Utility Tracker with its six children in order (UTIL-10)', () => {
    const utility = find(visibleMenu(classicMenu, EVERYONE), 'utility');
    expect(utility?.children?.map((child) => child.label)).toEqual([
      'Setup',
      'Track Utility Flats',
      'Utility Income',
      'Bulk Posting',
      'Receipts & Invoices',
      'Defaulters',
    ]);
    expect(find(classicMenu, 'utility.flats')?.tabs?.map((tab) => tab.label)).toEqual(['Utility Flats', 'Meters', 'Readings', 'Bills', 'Trends']);
  });

  it('follows the society’s features, tab by tab', () => {
    const menu = visibleMenu(classicMenu, {
      roleAllowlist: null,
      enabledFeatures: ['invoices'],
    });
    const registers = find(menu, 'income.registers');
    expect(registers?.tabs?.map((tab) => tab.label)).toEqual(['Invoices', 'Email Status Monitor']);
    expect(entryHref(registers as MenuNode)).toBe('/income/registers/invoices');
    expect(find(menu, 'bank')).toBeUndefined();
  });

  it('follows the supervisor allowlist of the standard menu', () => {
    const menu = visibleMenu(classicMenu, {
      roleAllowlist: getSidebarAllowlist('security_supervisor'),
    });
    const investigator = find(menu, 'gate.investigator');
    expect(investigator?.tabs?.map((tab) => tab.href)).toEqual([
      '/gate/investigator/visitors',
      '/gate/investigator/incidents',
      '/gate/investigator/vehicles',
      '/gate/investigator/staff-logs',
      '/gate/investigator/parcels',
      '/gate/investigator/overstays',
    ]);
    expect(find(menu, 'income')).toBeUndefined();
    expect(find(menu, 'ledger')).toBeUndefined();
  });

  it('shows nothing to a role with no admin access', () => {
    expect(visibleMenu(classicMenu, { roleAllowlist: getSidebarAllowlist(undefined) })).toEqual([]);
  });
});

describe('locate', () => {
  const menu = visibleMenu(classicMenu, EVERYONE);

  it.each([
    ['/', 'dashboard', undefined, undefined],
    ['/accounts/123', 'ledger', 'ledger.chart', undefined],
    ['/accounts/reconcile-debtors', 'more', 'more.reconcile', undefined],
    ['/gate/investigator/panic-alerts', 'gate', 'gate.investigator', 'gate.investigator.panic'],
    // The live SOS console sits under More (GATE-D2).
    ['/sos', 'more', 'more.sos', undefined],
    ['/gate/investigator/visitors', 'gate', 'gate.investigator', 'gate.investigator.visitors'],
    ['/gate/investigator/overstays', 'gate', 'gate.investigator', 'gate.investigator.overstays'],
    // Today's gate page stays inside the module, as Visitors.
    ['/gate', 'gate', 'gate.investigator', 'gate.investigator.visitors'],
    ['/staff/salaries', 'more', 'more.salaries', undefined],
    ['/parking/slots', 'parking', 'parking.slots', 'parking.slots.list'],
    ['/parking/slots/sublets', 'parking', 'parking.slots', 'parking.slots.sublets'],
    // Add / Edit Slot pages (PARK-07) stay under Slots.
    ['/parking/slots/new', 'parking', 'parking.slots', 'parking.slots.list'],
    // Add / Edit Vehicle pages (PARK-09) stay under All Vehicles.
    ['/parking/vehicles/new', 'parking', 'parking.vehicles', 'parking.vehicles.all'],
    ['/parking/setup', 'parking', 'parking.setup', undefined],
    ['/approvals/vehicles', 'parking', 'parking.vehicles', 'parking.vehicles.awaiting'],
    ['/parking', 'parking', undefined, undefined],
    ['/move-in-out/verify', 'move', 'move.verify', undefined],
    ['/move-in-out/approved-move-ins', 'move', 'move.approved', undefined],
    ['/approvals', 'more', 'more.approvals', undefined],
    ['/staff', 'staff', undefined, undefined],
    ['/staff/active', 'staff', 'staff.active', undefined],
    ['/staff/retired', 'staff', 'staff.retired', undefined],
    ['/staff/new', 'staff', 'staff.create', undefined],
    ['/staff/2b7e1c4e-0000-4000-8000-000000000001/edit', 'staff', undefined, undefined],
    ['/units/approved', 'units', 'units.approved', undefined],
    ['/units/directory', 'units', 'units.directory', undefined],
    ['/income/registers/invoices', 'income', 'income.registers', 'income.registers.invoices'],
    ['/helpdesk/setup/categories', 'helpdesk', 'helpdesk.setup', 'helpdesk.setup.categories'],
    ['/helpdesk/setup/notifications', 'helpdesk', 'helpdesk.setup', 'helpdesk.setup.notifications'],
    ['/helpdesk/setup/auto-responses', 'helpdesk', 'helpdesk.setup', 'helpdesk.setup.auto-responses'],
    ['/helpdesk/escalation', 'helpdesk', 'helpdesk.escalation', undefined],
    ['/helpdesk/open', 'helpdesk', 'helpdesk.open', undefined],
    ['/helpdesk/closed', 'helpdesk', 'helpdesk.closed', undefined],
    // Today's list stays inside the module, under no entry of its own.
    ['/tickets', 'helpdesk', undefined, undefined],
    // Today's routes stay inside their classic module, so in-page links still get a frame.
    ['/units', 'units', 'units.approved', undefined],
    ['/invoices', 'income', 'income.registers', 'income.registers.invoices'],
    ['/notifications', 'units', 'units.broadcast', undefined],
    // REP-04: Admin Reports, its run pages, today's /reports and module Reports pages.
    ['/admin-reports', 'reports', undefined, undefined],
    ['/admin-reports/gl.balance_sheet', 'reports', undefined, undefined],
    ['/reports', 'reports', undefined, undefined],
    ['/accounts/reports', 'ledger', 'ledger.reports', undefined],
  ])('%s → %s › %s › %s', (path, module, child, tab) => {
    const location = locate(path, menu);
    expect(location?.module.id).toBe(module);
    expect(location?.child?.id).toBe(child);
    expect(location?.tab?.id).toBe(tab);
  });

  it('returns null for a path outside the menu', () => {
    expect(locate('/no-such-screen', menu)).toBeNull();
  });
});
