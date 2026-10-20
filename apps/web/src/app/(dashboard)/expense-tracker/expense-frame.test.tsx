import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModuleFrame } from '@/components/layout/classic/module-frame';
import { classicMenu } from '@/components/layout/menu/classic-menu';
import { visibleMenu } from '@/components/layout/menu/menu-access';

// The Expense Tracker pages inside the classic module frame (EXP-20).

const nav = vi.hoisted(() => ({ pathname: '/expense-tracker/by-date' }));
const auditQuery = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/hooks/use-audit', () => ({
  useAuditLog: (filters: unknown, options: { enabled: boolean }) => {
    auditQuery(filters, options);
    return { data: { data: [] }, isLoading: false };
  },
}));

const menu = visibleMenu(classicMenu, { roleAllowlist: null });
const SOCIETY = '11111111-1111-4111-8111-111111111111';
const expense = classicMenu.find((node) => node.id === 'expense');
const CLOSE_TARGET = '/expense-tracker/setup/expense-heads';

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', SOCIETY);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: SOCIETY, name: 'S', role }] }),
  );
}

function renderAt(pathname: string) {
  nav.pathname = pathname;
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ModuleFrame menu={menu}>
        <p>page body</p>
      </ModuleFrame>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  auditQuery.mockReset();
});

const PAGES: ReadonlyArray<readonly [path: string, title: string]> = [
  ['/expense-tracker/setup/expense-heads', 'Expense Tracker › Setup'],
  ['/expense-tracker/setup/numbering', 'Expense Tracker › Setup'],
  ['/expense-tracker/purchase-workflow/open', 'Expense Tracker › Purchase Workflow'],
  ['/expense-tracker/purchase-workflow/closed', 'Expense Tracker › Purchase Workflow'],
  ['/expense-tracker/by-vendors/subledgers', 'Expense Tracker › By Vendors'],
  ['/expense-tracker/by-vendors/v-1/statement', 'Expense Tracker › By Vendors'],
  ['/expense-tracker/by-date', 'Expense Tracker › By Date'],
  ['/expense-tracker/budget', 'Expense Tracker › Budget'],
  ['/expense-tracker/budget/setup', 'Expense Tracker › Budget'],
  ['/expense-tracker/expenses-comparison', 'Expense Tracker › Expenses Comparison'],
  ['/expense-tracker/reports', 'Expense Tracker › Reports'],
  ['/purchases', 'Expense Tracker › Purchase Workflow'],
];

describe('Expense Tracker frame', () => {
  it.each(PAGES)('%s sits in its module with Create Request and Close', (path, title) => {
    renderAt(path);

    expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create Request' }).getAttribute('href')).toBe(expense?.create?.href);
    // Close returns to where the module opens; that page itself has none.
    const close = screen.queryByRole('link', { name: 'Close' });
    if (path === CLOSE_TARGET) expect(close).toBeNull();
    else expect(close?.getAttribute('href')).toBe(CLOSE_TARGET);
  });

  it('draws the Setup and Purchase Workflow sub-tabs as links', () => {
    renderAt('/expense-tracker/setup/numbering');
    const tabs = screen.getByRole('navigation', { name: 'Sub-tabs' });
    expect([...tabs.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
      '/expense-tracker/setup/expense-heads',
      '/expense-tracker/setup/purchase-request',
      '/expense-tracker/setup/numbering',
    ]);
  });

  it.each([
    ['/expense-tracker/by-date', 'vendor_payment,purchase'],
    ['/expense-tracker/budget', 'expense_budget'],
    ['/expense-tracker/purchase-workflow/open', 'purchase_request,purchase'],
    ['/expense-tracker/by-vendors/v-1/statement', 'vendor_bill,vendor_payment,vendor_debit_note,purchase'],
  ])('Show Logs on %s reads the audit history of %s', (path, types) => {
    signIn('accountant');
    renderAt(path);

    fireEvent.click(screen.getByRole('button', { name: 'Show Logs' }));

    expect(auditQuery).toHaveBeenLastCalledWith(expect.objectContaining({ entity_type: types }), expect.objectContaining({ enabled: true }));
  });

  it('frames the invoice and payment forms without Create or Close (they carry their own)', () => {
    renderAt('/expense-tracker/by-vendors/v-1/payment');

    expect(screen.getByRole('heading', { name: 'Expense Tracker › Payment' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Create Request' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Close' })).toBeNull();
  });
});
