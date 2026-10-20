import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { classicMenu } from './menu/classic-menu';
import { visibleMenu } from './menu/menu-access';
import { blockedMenuIds, isRouteBlocked, ModuleAccessGate } from './module-access';

/**
 * UNIT-24 / decision D1 — module switches in the admin web only hide: a
 * switched-off module leaves the menu and its direct URL says so; nothing a
 * switch says can show what the role does not.
 */

const state = vi.hoisted(() => ({ path: '/invoices', mine: null as unknown }));
vi.mock('next/navigation', () => ({ usePathname: () => state.path }));
vi.mock('@/hooks/use-access-control', () => ({ useMyModules: () => ({ data: state.mine }) }));

const switches = (off: string[], locked = false) => ({
  locked,
  count: 21 - off.length,
  modules: ['maintenance_fee', 'admin_residents', 'bank_cash'].map((id) => ({ module_id: id, label: id, enabled: !off.includes(id), locked })),
});

describe('module switches in the admin web', () => {
  it('maps a switched-off module to its classic menu entry and its routes', () => {
    const blocked = new Set(['maintenance_fee']);

    expect([...blockedMenuIds(blocked)]).toEqual(['income']);
    expect(isRouteBlocked('/invoices', blocked)).toBe(true);
    expect(isRouteBlocked('/income/members', blocked)).toBe(true);
    expect(isRouteBlocked('/units', blocked)).toBe(false);
    expect(isRouteBlocked('/', blocked)).toBe(false);
  });

  it('says "no access" on a direct URL to a switched-off module', () => {
    state.path = '/invoices';
    state.mine = switches(['maintenance_fee']);
    render(<ModuleAccessGate><p>Invoices screen</p></ModuleAccessGate>);

    expect(screen.getByRole('alert').textContent).toContain('You do not have access to this module');
    expect(screen.queryByText('Invoices screen')).toBeNull();
  });

  it('shows the screen when the module is on, and always for a community admin (locked)', () => {
    state.mine = switches([]);
    const { unmount } = render(<ModuleAccessGate><p>Invoices screen</p></ModuleAccessGate>);
    expect(screen.getByText('Invoices screen')).toBeTruthy();
    unmount();

    state.mine = switches(['maintenance_fee'], true);
    render(<ModuleAccessGate><p>Invoices screen</p></ModuleAccessGate>);
    expect(screen.getByText('Invoices screen')).toBeTruthy();
  });

  it('can never show a module the role does not see: switches only filter what the role shows', () => {
    // A role whose allowlist has no income entries; every switch is on.
    const forRole = visibleMenu(classicMenu, { roleAllowlist: new Set(['Dashboard', 'Units']), enabledFeatures: null });
    const hidden = blockedMenuIds(new Set<string>());
    const shown = forRole.filter((node) => !hidden.has(node.id));

    expect(shown.find((node) => node.id === 'income')).toBeUndefined();
    expect(shown.length).toBeLessThanOrEqual(forRole.length);
  });
});
