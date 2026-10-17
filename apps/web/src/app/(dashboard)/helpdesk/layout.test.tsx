import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModuleFrame } from '@/components/layout/classic/module-frame';
import { classicMenu } from '@/components/layout/menu/classic-menu';
import { visibleMenu } from '@/components/layout/menu/menu-access';

// The HelpDesk Tracker pages inside the classic module frame (HELP-11).

const nav = vi.hoisted(() => ({ pathname: '/helpdesk/setup/categories' }));
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

const HELPDESK_PAGES = [
  '/helpdesk/setup/categories',
  '/helpdesk/setup/notifications',
  '/helpdesk/setup/auto-responses',
  '/helpdesk/escalation',
];

describe('HelpDesk Tracker frame', () => {
  it.each(HELPDESK_PAGES)('%s has Create Request and Close', (path) => {
    renderAt(path);

    const create = screen.getByRole('link', { name: 'Create Request' });
    const helpdesk = classicMenu.find((node) => node.id === 'helpdesk');
    expect(create.getAttribute('href')).toBe(helpdesk?.create?.href);
    expect(screen.getByRole('link', { name: 'Close' }).getAttribute('href')).toBe(helpdesk?.close);
  });

  it('titles the setup screens and shows their sub-tabs', () => {
    renderAt('/helpdesk/setup/notifications');

    expect(screen.getByRole('heading', { name: 'HelpDesk Tracker › Setup' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Notification Alerts' }).getAttribute('aria-current')).toBe('page');
  });

  it.each(HELPDESK_PAGES)('Show Logs on %s opens the helpdesk history', (path) => {
    signIn('community_admin');
    renderAt(path);

    fireEvent.click(screen.getByRole('button', { name: 'Show Logs' }));

    expect(auditQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ entity_type: 'helpdesk' }),
      { enabled: true },
    );
  });
});
