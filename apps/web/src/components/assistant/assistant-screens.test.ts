import { describe, expect, it } from 'vitest';
import type { NavGroup } from '../layout/menu/standard-menu';
import type { MenuNode } from '../layout/menu/classic-menu';
import { classicScreens, isSafeAppPath, standardScreens } from './assistant-screens';

const groups: NavGroup[] = [
  {
    label: 'Finance',
    items: [
      { label: 'Invoices', href: '/invoices', icon: null, feature: 'accounts' },
      { label: 'Receipts', href: '/receipts', icon: null, feature: 'accounts' },
    ],
  },
  { label: 'Community', items: [{ label: 'Tickets', href: '/tickets', icon: null }] },
] as NavGroup[];

describe('Assistant screens (SB-02 menu as the person sees it)', () => {
  it('lists the standard entries as Group › Label', () => {
    expect(standardScreens(groups, { roleAllowlist: null, blocked: new Set() })).toEqual([
      { path: 'Finance › Invoices', href: '/invoices' },
      { path: 'Finance › Receipts', href: '/receipts' },
      { path: 'Community › Tickets', href: '/tickets' },
    ]);
  });

  it('leaves out features that are off, entries the role cannot see and switched-off modules', () => {
    expect(standardScreens(groups, { enabledFeatures: ['tickets'], roleAllowlist: null, blocked: new Set() })).toEqual([
      { path: 'Community › Tickets', href: '/tickets' },
    ]);
    expect(standardScreens(groups, { roleAllowlist: new Set(['Receipts']), blocked: new Set() })).toEqual([
      { path: 'Finance › Receipts', href: '/receipts' },
    ]);
    expect(standardScreens(groups, { roleAllowlist: null, blocked: new Set(['maintenance_fee']) })).toEqual([
      { path: 'Community › Tickets', href: '/tickets' },
    ]);
  });

  it('lists the classic menu as Module › Child', () => {
    const menu: MenuNode[] = [
      { id: 'income', label: 'Income Tracker', children: [{ id: 'income.defaulters', label: 'Defaulters', href: '/income/defaulters' }] },
    ];
    expect(classicScreens(menu)).toEqual([{ path: 'Income Tracker › Defaulters', href: '/income/defaulters' }]);
  });

  it.each([
    ['/income/defaulters', true],
    ['/invoices?filter=defaulters', true],
    ['//evil.example.com/x', false],
    ['https://evil.example.com', false],
    ['javascript:alert(1)', false],
    ['/\\evil.example.com', false],
    ['/a/../../b', false],
  ])('treats %s as an in-app path: %s', (href, safe) => {
    expect(isSafeAppPath(href)).toBe(safe);
  });
});
