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
      'Add Users',
      'Approved Users',
      'Broadcast',
      'Member Directory',
      'Member Categories',
      'KYC Verification',
    ]);
  });

  it('each Units & Users child opens its own classic route', () => {
    expect(find(menu, 'units')?.children?.slice(0, 3).map((child) => child.href)).toEqual([
      '/units/add-users',
      '/units/approved',
      '/units/broadcast',
    ]);
  });

  it('Income Tracker shows Setup and Receipts & Invoices with their sub-tabs', () => {
    expect(labels('income')).toEqual(['Setup', 'Receipts & Invoices']);
    expect(find(menu, 'income.setup')?.tabs?.map((tab) => [tab.label, tab.href])).toEqual([
      ['Auto Invoicing', '/income/setup/auto-invoicing'],
      ['Payment Gateway', '/income/setup/payment-gateway'],
      ['Customize Invoice', '/income/setup/customize-invoice'],
      ['Defaulters', '/income/setup/defaulters'],
    ]);
    expect(entryHref(find(menu, 'income.setup') as MenuNode)).toBe('/income/setup/auto-invoicing');
    expect(governingItem('/income/setup/defaulters')?.href).toBe('/invoices');
    expect(find(menu, 'income.registers')?.tabs?.map((tab) => [tab.label, tab.href])).toEqual([
      ['Receipts', '/income/registers/receipts'],
      ['Invoices', '/income/registers/invoices'],
    ]);
  });

  it('HelpDesk Tracker shows Setup with its built screens as sub-tabs, then the status lists', () => {
    expect(labels('helpdesk')).toEqual(['Setup', 'Escalation', 'Open Requests', 'Closed Requests']);
    expect(find(menu, 'helpdesk.escalation')?.href).toBe('/helpdesk/escalation');
    expect(find(menu, 'helpdesk.setup')?.tabs?.map((tab) => [tab.label, tab.href])).toEqual([
      ['Setup Helpdesk Categories', '/helpdesk/setup/categories'],
      ['Notification Alerts', '/helpdesk/setup/notifications'],
      ['Automated Responses', '/helpdesk/setup/auto-responses'],
    ]);
    expect(entryHref(find(menu, 'helpdesk.setup') as MenuNode)).toBe('/helpdesk/setup/categories');
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
    expect(find(menu, 'helpdesk.reports')).toBeUndefined();
    expect(find(menu, 'rules')).toBeUndefined();
    expect(find(menu, 'forms')).toBeUndefined();
    expect(find(menu, 'helpdesk.open')?.href).toBe('/helpdesk/open');
  });

  it('turns a module whose children are all planned into a plain link', () => {
    const utility = find(visibleMenu(classicMenu, EVERYONE), 'utility');
    expect(utility?.href).toBe('/utilities');
    expect(utility?.children).toBeUndefined();
  });

  it('follows the society’s features, tab by tab', () => {
    const menu = visibleMenu(classicMenu, {
      roleAllowlist: null,
      enabledFeatures: ['invoices'],
    });
    const registers = find(menu, 'income.registers');
    expect(registers?.tabs?.map((tab) => tab.label)).toEqual(['Invoices']);
    expect(entryHref(registers as MenuNode)).toBe('/income/registers/invoices');
    expect(find(menu, 'bank')).toBeUndefined();
  });

  it('follows the supervisor allowlist of the standard menu', () => {
    const menu = visibleMenu(classicMenu, {
      roleAllowlist: getSidebarAllowlist('security_supervisor'),
    });
    const investigator = find(menu, 'gate.investigator');
    expect(investigator?.tabs?.map((tab) => tab.href)).toEqual(['/gate']);
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
    ['/sos', 'gate', 'gate.investigator', 'gate.investigator.panic'],
    ['/staff/salaries', 'more', 'more.salaries', undefined],
    ['/staff', 'staff', undefined, undefined],
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
