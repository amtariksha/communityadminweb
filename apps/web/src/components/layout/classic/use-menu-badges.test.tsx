import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MenuNode } from '../menu/classic-menu';
import { useMenuBadges } from './use-menu-badges';

const counts = vi.hoisted(() => vi.fn());
vi.mock('@/hooks', () => ({
  useTicketScopeCounts: (enabled: boolean) => counts(enabled),
}));

const HELPDESK: MenuNode = {
  id: 'helpdesk',
  label: 'HelpDesk Tracker',
  children: [{ id: 'helpdesk.open', label: 'Open Requests', href: '/helpdesk/open', badgeKey: 'helpdesk.open' }],
};

describe('useMenuBadges', () => {
  it('counts the HelpDesk lists when the user can see them', () => {
    counts.mockReturnValue({ data: { open: 12, closed: 40 } });

    const { result } = renderHook(() => useMenuBadges([HELPDESK], 'community_admin'));

    expect(counts).toHaveBeenLastCalledWith(true);
    expect(result.current).toEqual({ 'helpdesk.open': 12, 'helpdesk.closed': 40 });
  });

  it('asks nothing when HelpDesk is not in the user’s menu', () => {
    counts.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useMenuBadges([{ id: 'units', label: 'Units & Users', href: '/units' }], 'community_admin'));

    expect(counts).toHaveBeenLastCalledWith(false);
    expect(result.current).toEqual({});
  });

  it('asks nothing for a role the list refuses', () => {
    counts.mockReturnValue({ data: undefined });

    renderHook(() => useMenuBadges([HELPDESK], 'committee_member'));

    expect(counts).toHaveBeenLastCalledWith(false);
  });

  it('shows nothing while an older server sends no counts', () => {
    counts.mockReturnValue({ data: null });

    const { result } = renderHook(() => useMenuBadges([HELPDESK], 'community_admin'));

    expect(result.current).toEqual({});
  });
});
