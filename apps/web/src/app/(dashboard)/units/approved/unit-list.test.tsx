import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnitList } from './unit-list';

/**
 * Approved Users › the left list (UNIT-12, screen UNIT-S5): totals from the
 * API, server search, block links, the Users switch and View More.
 */

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const blocks = vi.hoisted(() => ({ onChange: undefined as undefined | ((block: string | null) => void) }));
vi.mock('@/components/block-links', () => ({
  UnitBlockLinks: ({ onChange }: { onChange: (block: string | null) => void }): ReactNode => {
    blocks.onChange = onChange;
    return <button type="button" onClick={() => onChange('B')}>Block B (1)</button>;
  },
}));

const lists = vi.hoisted(() => ({
  units: vi.fn(),
  users: vi.fn(),
  fetchNextPage: vi.fn(),
}));
vi.mock('@/hooks/use-unit-panel', () => ({
  useApprovedUnitList: (filters: unknown, enabled: boolean) => lists.units(filters, enabled),
  useApprovedUserList: (filters: unknown, enabled: boolean) => lists.users(filters, enabled),
}));

function units(count: number, start = 0) {
  return Array.from({ length: count }, (_, index) => ({
    id: `u-${start + index}`,
    unit_number: String(101 + start + index),
    block: 'A',
    owner_names: [`Owner ${start + index}`],
  }));
}

function pages(data: unknown[][], total: number, extra: Record<string, unknown> = {}) {
  return {
    isLoading: false,
    data: { pages: data.map((rows) => ({ data: rows, total, totals: { units: 500, users: 812 } })) },
    hasNextPage: data.flat().length < total,
    isFetchingNextPage: false,
    fetchNextPage: lists.fetchNextPage,
    ...extra,
  };
}

const IDLE = { isLoading: false, data: undefined, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() };

describe('UnitList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    lists.units.mockReset().mockReturnValue(pages([units(50)], 500));
    lists.users.mockReset().mockReturnValue(IDLE);
    lists.fetchNextPage.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the totals from the API and the first 50 units with View More', () => {
    render(<UnitList selectedUnitId={null} />);

    expect(screen.getByText('Total 500 units and 812 users')).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'Units' })).getAllByRole('listitem')).toHaveLength(50);
    expect(screen.getByText('Owners: Owner 0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'View More' }));
    expect(lists.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('shows every loaded page, and no View More once all are loaded', () => {
    lists.units.mockReturnValue(pages([units(50), units(10, 50)], 60));
    render(<UnitList selectedUnitId={null} />);

    expect(within(screen.getByRole('list', { name: 'Units' })).getAllByRole('listitem')).toHaveLength(60);
    expect(screen.queryByRole('button', { name: 'View More' })).toBeNull();
  });

  it('opens a unit at its own address and marks the selected one', () => {
    render(<UnitList selectedUnitId="u-1" />);

    const link = screen.getByText('A-102').closest('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/units/approved/u-1');
    expect(link.className).toContain('font-semibold');
  });

  it('searches on the server once typing pauses', () => {
    render(<UnitList selectedUnitId={null} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search By Units/Users' }), { target: { value: ' rao ' } });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(lists.units).toHaveBeenLastCalledWith({ search: 'rao', block: null }, true);
  });

  it('narrows the list to a block from the block links', () => {
    render(<UnitList selectedUnitId={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Block B (1)' }));

    expect(lists.units).toHaveBeenLastCalledWith({ search: '', block: 'B' }, true);
  });

  it('lists people in Users mode, each opening their unit', () => {
    lists.users.mockReturnValue(
      pages([[{ member_id: 'm-1', unit_id: 'u-7', unit_number: '107', block: 'A', name: 'Test Rao', member_type: 'tenant_family' }]], 1),
    );
    render(<UnitList selectedUnitId={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Users' }));

    expect(lists.users).toHaveBeenLastCalledWith({ search: '', block: null }, true);
    expect(lists.units).toHaveBeenLastCalledWith({ search: '', block: null }, false);
    const person = screen.getByText('Test Rao — A-107 — Tenant Family').closest('a') as HTMLAnchorElement;
    expect(person.getAttribute('href')).toBe('/units/approved/u-7');
  });

  it('says the users list is not available on an API that answers it with units', () => {
    lists.users.mockReturnValue(pages([units(2)], 2));
    render(<UnitList selectedUnitId={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Users' }));

    expect(screen.getByText('The users list is not available yet on this server.')).toBeTruthy();
  });

  it('hides the totals banner on an API without totals', () => {
    lists.units.mockReturnValue({ ...pages([units(1)], 1), data: { pages: [{ data: units(1), total: 1 }] } });
    render(<UnitList selectedUnitId={null} />);

    expect(screen.queryByText(/^Total /)).toBeNull();
    expect(blocks.onChange).toBeDefined();
  });
});
