import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classicMenu, type MenuNode } from './menu/classic-menu';
import { governingItem, locate, menuHrefs, visibleMenu } from './menu/menu-access';

// Bank & Cash in the classic menu (BANK-06).

const bank = classicMenu.find((node) => node.id === 'bank') as MenuNode;
const visible = visibleMenu(classicMenu, { roleAllowlist: null });

describe('classic Bank & Cash', () => {
  it('has Setup · Transfer · Bank & Cash Accounts · Taxes · Fixed Deposits · Reports in that order', () => {
    expect(bank.children?.map((child) => child.label)).toEqual([
      'Setup',
      'Transfer',
      'Bank & Cash Accounts',
      'Taxes',
      'Fixed Deposits',
      'Reports',
    ]);
    // BANK-17 built Setup; Reports is the module's report page.
    expect(visible.find((node) => node.id === 'bank')?.children?.map((child) => child.label)).toEqual([
      'Setup',
      'Transfer',
      'Bank & Cash Accounts',
      'Taxes',
      'Fixed Deposits',
      'Reports',
    ]);
  });

  it('gives Bank & Cash Accounts and Fixed Deposits their sub-links as routes', () => {
    const tabs = (id: string) => bank.children?.find((child) => child.id === id)?.tabs?.map((tab) => [tab.label, tab.href]);
    expect(tabs('bank.accounts')).toEqual([
      ['Register', '/bank-cash/accounts'],
      ['Cheques', '/bank-cash/accounts/cheques'],
      ['Statement Import', '/bank-cash/accounts/statement-import'],
      ['Add account', '/bank-cash/accounts/new'],
    ]);
    // BANK-15: the four tax registers.
    expect(tabs('bank.taxes')).toEqual([
      ['TDS', '/bank-cash/taxes/tds'],
      ['State GST', '/bank-cash/taxes/state-gst'],
      ['Central GST', '/bank-cash/taxes/central-gst'],
      ['Integrated GST', '/bank-cash/taxes/integrated-gst'],
    ]);
    expect(tabs('bank.fixed-deposits')).toEqual([
      ['Active Fixed Deposits', '/bank-cash/fixed-deposits/active'],
      ['Archived Fixed Deposits', '/bank-cash/fixed-deposits/archived'],
    ]);
  });

  it('points at pages that exist, gated like the Bank entry', () => {
    const routes = join(process.cwd(), 'src', 'app', '(dashboard)');
    expect(menuHrefs([bank]).filter((href) => !existsSync(join(routes, href, 'page.tsx')))).toEqual([]);
    expect(governingItem('/bank-cash/transfer')?.href).toBe('/bank');
    expect(visibleMenu(classicMenu, { roleAllowlist: null, enabledFeatures: ['accounts'] }).find((node) => node.id === 'bank')).toBeUndefined();
  });

  it.each([
    ['/bank-cash/accounts/cheques', 'bank.accounts', 'bank.accounts.cheques'],
    ['/bank-cash/accounts', 'bank.accounts', 'bank.accounts.register'],
    ['/bank-cash/fixed-deposits/archived', 'bank.fixed-deposits', 'bank.fixed-deposits.archived'],
    ['/bank', undefined, undefined],
  ])('%s sits in Bank & Cash › %s › %s', (path, child, tab) => {
    const location = locate(path, visible);
    expect(location?.module.id).toBe('bank');
    expect(location?.child?.id).toBe(child);
    expect(location?.tab?.id).toBe(tab);
  });

  it('closes to the accounts register and shows each page’s logs', () => {
    expect(bank.close).toBe('/bank-cash/accounts');
    expect(bank.children?.find((child) => child.id === 'bank.transfer')?.logs).toEqual(['bank_transfer']);
  });
});
