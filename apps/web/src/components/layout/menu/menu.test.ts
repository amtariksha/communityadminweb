import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSidebarAllowlist } from '@/lib/admin-roles';
import { classicMenu, type MenuNode } from './classic-menu';
import { standardMenu } from './standard-menu';
import {
  entryHref,
  governingItem,
  locate,
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

  it('never uses a competitor brand word', () => {
    const labels = JSON.stringify(classicMenu, (key, value) => (key === 'icon' ? undefined : value));
    expect(labels).not.toMatch(/adda|gatekeeper|aura/i);
  });
});

describe('menus point only at screens that exist', () => {
  it.each([
    ['standard', standardMenu.flatMap((group) => group.items.map((item) => item.href))],
    ['classic', menuHrefs(classicMenu)],
  ])('every %s route has a page', (_label, hrefs) => {
    expect(hrefs.filter((href) => !routeExists(href))).toEqual([]);
  });

  it('every classic route is owned by a standard entry, so it inherits its gating', () => {
    expect(menuHrefs(classicMenu).filter((href) => !governingItem(href))).toEqual([]);
  });
});

describe('visibleMenu', () => {
  it('hides planned entries and modules with nothing built yet', () => {
    const menu = visibleMenu(classicMenu, EVERYONE);
    expect(find(menu, 'helpdesk.open')).toBeUndefined();
    expect(find(menu, 'rules')).toBeUndefined();
    expect(find(menu, 'forms')).toBeUndefined();
    expect(find(menu, 'helpdesk.all')?.href).toBe('/tickets');
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
    expect(entryHref(registers as MenuNode)).toBe('/invoices');
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
