import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModuleFrame } from '@/components/layout/classic/module-frame';
import { classicMenu, type MenuNode } from '@/components/layout/menu/classic-menu';
import { governingItem, menuHrefs, visibleMenu } from '@/components/layout/menu/menu-access';

// General Ledger in the classic layout (GL-09).

const nav = vi.hoisted(() => ({ pathname: '/general-ledger/trial-balance' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/hooks/use-audit', () => ({
  useAuditLog: () => ({ data: { data: [] }, isLoading: false }),
}));

const menu = visibleMenu(classicMenu, { roleAllowlist: null });
const ledger = menu.find((node) => node.id === 'ledger') as MenuNode;
const SOCIETY = '11111111-1111-4111-8111-111111111111';

function renderAt(pathname: string) {
  nav.pathname = pathname;
  localStorage.setItem('communityos_tenant', SOCIETY);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role: 'community_admin', societies: [{ id: SOCIETY, name: 'S', role: 'community_admin' }] }),
  );
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ModuleFrame menu={menu}>
        <p>page body</p>
      </ModuleFrame>
    </QueryClientProvider>,
  );
}

afterEach(() => localStorage.clear());

describe('General Ledger classic routes', () => {
  it('expands to the six children in order', () => {
    expect(ledger.children?.map((child) => child.label)).toEqual([
      'Chart of Accounts',
      'Journal Entries',
      'Query',
      'Trial Balance',
      'Financial Statements',
      'Reports',
    ]);
  });

  it('points every entry at a page that exists', () => {
    const routes = join(process.cwd(), 'src', 'app', '(dashboard)');
    const missing = menuHrefs([ledger]).filter((href) => !existsSync(join(routes, href, 'page.tsx')));
    expect(missing).toEqual([]);
    // Reports is REP-04's module page, /accounts/reports.
    expect(menuHrefs([ledger]).filter((href) => !href.startsWith('/general-ledger/'))).toEqual(['/accounts/reports']);
  });

  it('gates the statements by Reports and the rest by Accounts, as the standard menu does', () => {
    expect(governingItem('/general-ledger/trial-balance')?.href).toBe('/reports');
    expect(governingItem('/general-ledger/financial-statements')?.href).toBe('/reports');
    expect(governingItem('/general-ledger/chart-of-accounts/assets')?.href).toBe('/accounts');
    expect(governingItem('/general-ledger/journal-entries/bulk-posting')?.href).toBe('/accounts');
    const noReports = visibleMenu(classicMenu, { roleAllowlist: null, enabledFeatures: ['accounts'] });
    const labels = noReports.find((node) => node.id === 'ledger')?.children?.map((child) => child.label);
    expect(labels).toEqual(['Chart of Accounts', 'Journal Entries', 'Query']);
  });

  it.each([
    ['/general-ledger/chart-of-accounts/assets', 'General Ledger › Chart of Accounts'],
    ['/general-ledger/journal-entries/bulk-posting', 'General Ledger › Journal Entries'],
    ['/general-ledger/journal-entries/old', 'General Ledger › Journal Entries'],
    ['/general-ledger/journal-entries/3f2b0c1e-0000-4000-8000-000000000001', 'General Ledger › Journal Entries'],
    ['/general-ledger/journal-entries/bulk-posting/retained-earnings', 'General Ledger › Journal Entries'],
    ['/general-ledger/query/by-group', 'General Ledger › Query'],
    ['/general-ledger/trial-balance', 'General Ledger › Trial Balance'],
    ['/general-ledger/financial-statements', 'General Ledger › Financial Statements'],
    ['/accounts/reports', 'General Ledger › Reports'],
    ['/accounts', 'General Ledger › Chart of Accounts'],
  ])('%s opens inside the frame as "%s"', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    expect(screen.getByText('page body')).toBeTruthy();
  });

  it('shows the chart of accounts types as sub-tabs', () => {
    renderAt('/general-ledger/chart-of-accounts/income');
    const tabs = screen.getByRole('navigation', { name: 'Sub-tabs' });
    expect([...tabs.querySelectorAll('a')].map((link) => link.textContent)).toEqual(['Assets', 'Liabilities', 'Income', 'Expense', 'Groups']);
    expect(screen.getByRole('link', { name: 'Income' }).getAttribute('aria-current')).toBe('page');
  });

  it('offers Create Journal Entry on every page and frames it as a page of the module', () => {
    renderAt('/general-ledger/trial-balance');
    expect(screen.getByRole('link', { name: 'Create Journal Entry' }).getAttribute('href')).toBe(
      '/general-ledger/journal-entries/create',
    );
    cleanup();
    renderAt('/general-ledger/journal-entries/create');
    expect(screen.getByRole('heading', { name: 'General Ledger › Create Journal Entry' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Close' })).toBeNull();
  });

  it('offers Show Logs over the page’s records', () => {
    renderAt('/general-ledger/chart-of-accounts/assets');
    expect(screen.getByRole('button', { name: 'Show Logs' })).toBeTruthy();
  });
});
