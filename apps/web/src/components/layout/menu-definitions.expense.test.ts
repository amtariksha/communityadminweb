import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classicMenu, type MenuNode } from './menu/classic-menu';
import { standardMenu } from './menu/standard-menu';
import { governingItem, locate, visibleMenu } from './menu/menu-access';

// The Expense Tracker module of the classic menu (EXP-20).

const expense = classicMenu.find((node) => node.id === 'expense') as MenuNode;
const menu = visibleMenu(classicMenu, { roleAllowlist: null });
const visible = menu.find((node) => node.id === 'expense') as MenuNode;
const DASHBOARD = join(process.cwd(), 'src', 'app', '(dashboard)');
const routeExists = (href: string): boolean => existsSync(join(DASHBOARD, href.split('?')[0], 'page.tsx'));
const child = (id: string): MenuNode | undefined => visible.children?.find((node) => node.id === id);

describe('classic menu — Expense Tracker', () => {
  it('holds the committee’s seven children in their order', () => {
    expect(expense.children?.map((node) => node.label)).toEqual([
      'Setup',
      'Purchase Workflow',
      'By Vendors',
      'By Date',
      'Budget',
      'Expenses Comparison',
      'Reports',
    ]);
  });

  it('shows all seven once their screens exist, each opening a real route', () => {
    expect(visible.children?.map((node) => node.label)).toEqual(expense.children?.map((node) => node.label));
    const entries = (visible.children ?? []).flatMap((node) => [node.href, ...(node.tabs ?? []).map((tab) => tab.href)]);
    for (const href of entries.filter((value): value is string => Boolean(value))) {
      expect(routeExists(href), href).toBe(true);
    }
  });

  it('makes each sub-tab its own URL', () => {
    expect(child('expense.setup')?.tabs?.map((tab) => tab.href)).toEqual([
      '/expense-tracker/setup/expense-heads',
      '/expense-tracker/setup/purchase-request',
      '/expense-tracker/setup/numbering',
    ]);
    expect(child('expense.purchase-workflow')?.tabs?.map((tab) => tab.href)).toEqual([
      '/expense-tracker/purchase-workflow/open',
      '/expense-tracker/purchase-workflow/closed',
    ]);
    // EXP-26 adds Bulk Posting beside SubLedgers.
    expect(child('expense.by-vendors')?.tabs?.map((tab) => tab.href)).toEqual(['/expense-tracker/by-vendors/subledgers', '/expense-tracker/by-vendors/bulk-posting']);
    expect(child('expense.budget')?.href).toBe('/expense-tracker/budget');
    expect(child('expense.comparison')?.href).toBe('/expense-tracker/expenses-comparison');
  });

  it('has Create Request on every page, opening a real page', () => {
    expect(expense.create).toEqual({ label: 'Create Request', href: '/expense-tracker/purchase-workflow/new' });
    expect(routeExists(expense.create?.href ?? '')).toBe(true);
  });

  it('keeps today’s /purchases, a vendor’s statement and the budget setup grid inside the module', () => {
    expect(locate('/purchases', menu)?.child?.id).toBe('expense.purchase-workflow');
    expect(locate('/expense-tracker/by-vendors/v-1/statement', menu)?.child?.id).toBe('expense.by-vendors');
    expect(locate('/expense-tracker/budget/setup', menu)?.child?.id).toBe('expense.budget');
    expect(locate('/expense-tracker/by-vendors/v-1/invoice', menu)?.form).toBe(true);
  });

  it('names the record types of each screen for Show Logs, the old `purchase` rows included', () => {
    const tab = (parent: string, id: string) => child(parent)?.tabs?.find((node) => node.id === id);
    expect(tab('expense.purchase-workflow', 'expense.purchase-workflow.open')?.logs).toEqual(['purchase_request', 'purchase']);
    expect(child('expense.by-date')?.logs).toEqual(['vendor_payment', 'purchase']);
    expect(child('expense.budget')?.logs).toEqual(['expense_budget']);
    expect(child('expense.by-vendors')?.logs).toEqual(expect.arrayContaining(['vendor_bill', 'vendor_payment', 'vendor_debit_note']));
    expect(tab('expense.setup', 'expense.setup.numbering')?.logs).toContain('purchase_numbering');
  });

  it('follows the Purchases entry, and standard keeps Purchases → /purchases', () => {
    expect(governingItem('/expense-tracker/budget')?.href).toBe('/purchases');
    expect(governingItem('/expense-tracker/expenses-comparison')?.href).toBe('/purchases');
    const purchases = standardMenu.flatMap((group) => group.items).find((item) => item.href === '/purchases');
    expect(purchases).toBeDefined();
  });
});
