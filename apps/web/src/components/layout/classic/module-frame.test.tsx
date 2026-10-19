import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { classicMenu } from '../menu/classic-menu';
import { visibleMenu } from '../menu/menu-access';
import { ModuleFrame } from './module-frame';
import { matchScreens, screenEntries } from './screen-finder';

const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

const menu = visibleMenu(classicMenu, { roleAllowlist: null });

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

function signIn(role: string): void {
  const tenant = '11111111-1111-4111-8111-111111111111';
  localStorage.setItem('communityos_tenant', tenant);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: tenant, name: 'S', role }] }),
  );
}

afterEach(() => {
  nav.pathname = '/';
  localStorage.clear();
});

describe('ModuleFrame', () => {
  it('titles the page with its module and menu entry', () => {
    renderAt('/receipts');
    expect(screen.getByRole('heading', { name: 'Income Tracker › Receipts & Invoices' })).toBeTruthy();
    expect(screen.getByText('page body')).toBeTruthy();
  });

  it('draws sub-tabs as links to real routes and marks the current one', () => {
    renderAt('/invoices');
    const tabs = screen.getByRole('navigation', { name: 'Sub-tabs' });
    const links = Array.from(tabs.querySelectorAll('a'));
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Receipts', '/income/registers/receipts'],
      ['Credit Notes', '/income/registers/credit-notes'],
      ['Invoices', '/income/registers/invoices'],
      ['Email Status Monitor', '/income/registers/email-status'],
    ]);
    expect(screen.getByRole('link', { name: 'Invoices' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Receipts' }).getAttribute('aria-current')).toBeNull();
  });

  it('offers Close back to the module’s first screen', () => {
    renderAt('/vendor-master/expense');
    expect(screen.queryByRole('link', { name: 'Close' })).toBeNull();
    renderAt('/customers');
    expect(screen.getAllByRole('link', { name: 'Close' }).at(-1)?.getAttribute('href')).toBe('/vendor-master/expense');
  });

  it('offers no Close inside the More group', () => {
    renderAt('/settings');
    expect(screen.getByRole('heading', { name: 'More › Settings' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Close' })).toBeNull();
  });

  it('offers Show Logs where the entry names its record types', () => {
    signIn('community_admin');
    renderAt('/vendors');
    expect(screen.getByRole('button', { name: 'Show Logs' })).toBeTruthy();
  });

  it('offers no Show Logs where the entry names none', () => {
    signIn('community_admin');
    renderAt('/kpi-dashboard');
    expect(screen.queryByRole('button', { name: 'Show Logs' })).toBeNull();
  });

  it('keeps detail pages inside their module', () => {
    renderAt('/accounts/1234');
    expect(screen.getByRole('heading', { name: 'General Ledger › Chart of Accounts' })).toBeTruthy();
  });

  it('leaves the dashboard and unknown pages unframed', () => {
    renderAt('/');
    expect(screen.queryByRole('heading')).toBeNull();
    renderAt('/no-such-screen');
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

describe('screen finder', () => {
  const entries = screenEntries(menu);

  it('finds a screen by any words of its menu path', () => {
    expect(matchScreens(entries, 'chart accounts').map((e) => e.href)).toEqual(['/accounts']);
    expect(matchScreens(entries, 'income invoices').map((e) => e.href)).toEqual([
      '/income/registers/receipts',
      '/income/registers/credit-notes',
      '/income/registers/invoices',
      '/income/registers/email-status',
    ]);
    expect(matchScreens(entries, 'panic').map((e) => e.path)).toEqual([
      'Gate & Visitors › Incident Investigator › Panic Alerts',
    ]);
  });

  it('never offers a planned screen', () => {
    expect(matchScreens(entries, 'violations')).toEqual([]);
  });

  it('returns nothing for an empty query', () => {
    expect(matchScreens(entries, '   ')).toEqual([]);
  });
  it.each(['/amenities/setup', '/amenities/calendar', '/amenities', '/events'])(
    'shows Reserve Amenity on the Amenity & Event page %s (AMEN-10)',
    (path) => {
      renderAt(path);
      expect(screen.getByRole('link', { name: 'Reserve Amenity' }).getAttribute('href')).toBe('/amenities/reserve');
    },
  );

  it('gives the amenity form pages their own Save and Close, without Reserve Amenity', () => {
    renderAt('/amenities/am-1/edit');
    expect(screen.getByRole('heading', { name: 'Amenity & Event › Edit Amenity' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Reserve Amenity' })).toBeNull();
  });
});
