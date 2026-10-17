import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { MenuNode } from '../menu/classic-menu';
import { ModuleFrame } from './module-frame';

const nav = vi.hoisted(() => ({ pathname: '/helpdesk/new' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

const MENU: MenuNode[] = [
  {
    id: 'helpdesk',
    label: 'HelpDesk Tracker',
    create: { label: 'Create Request', href: '/helpdesk/new' },
    children: [
      { id: 'helpdesk.escalation', label: 'Escalation', href: '/helpdesk/escalation' },
      { id: 'helpdesk.open', label: 'Open Requests', href: '/helpdesk/open' },
    ],
  },
];

function renderAt(pathname: string) {
  nav.pathname = pathname;
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ModuleFrame menu={MENU}>
        <p>form body</p>
      </ModuleFrame>
    </QueryClientProvider>,
  );
}

describe('ModuleFrame — a form page (SB-07)', () => {
  it('frames the create page under its module', () => {
    renderAt('/helpdesk/new');

    expect(screen.getByRole('heading', { name: 'HelpDesk Tracker › Create Request' })).toBeTruthy();
    expect(screen.getByText('form body')).toBeTruthy();
  });

  it('leaves Create and Close to the form, which has its own Close', () => {
    renderAt('/helpdesk/new');

    expect(screen.queryByRole('link', { name: 'Create Request' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Close' })).toBeNull();
  });

  it('keeps Create on the module’s other pages', () => {
    renderAt('/helpdesk/open');

    expect(screen.getByRole('link', { name: 'Create Request' }).getAttribute('href')).toBe('/helpdesk/new');
  });
});
