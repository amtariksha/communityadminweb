import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MenuNode } from '../menu/classic-menu';
import { ClassicSidebar } from './classic-sidebar';

const nav = vi.hoisted(() => ({ pathname: '/helpdesk/open' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

const MENU: MenuNode[] = [
  {
    id: 'helpdesk',
    label: 'HelpDesk Tracker',
    children: [
      { id: 'helpdesk.escalation', label: 'Escalation', href: '/helpdesk/escalation' },
      { id: 'helpdesk.open', label: 'Open Requests', href: '/helpdesk/open', badgeKey: 'helpdesk.open' },
      { id: 'helpdesk.closed', label: 'Closed Requests', href: '/helpdesk/closed', badgeKey: 'helpdesk.closed' },
    ],
  },
];

afterEach(() => {
  nav.pathname = '/helpdesk/open';
});

describe('ClassicSidebar — counts on status entries (SB-05)', () => {
  it('shows each status entry’s count beside its label', () => {
    render(
      <ClassicSidebar menu={MENU} open={false} onClose={vi.fn()} badges={{ 'helpdesk.open': 12, 'helpdesk.closed': 40 }} />,
    );

    expect(screen.getByRole('link', { name: 'Open Requests 12' }).getAttribute('href')).toBe('/helpdesk/open');
    expect(screen.getByRole('link', { name: 'Closed Requests 40' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Escalation' })).toBeTruthy();
  });

  it('shows no count until it is known', () => {
    render(<ClassicSidebar menu={MENU} open={false} onClose={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Open Requests' })).toBeTruthy();
  });
});
