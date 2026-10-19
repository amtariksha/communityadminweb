import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpiredInventory } from './inventory/expired-inventory';

/** Inventory › Expired (ASSET-12): the expired items with the day and Re-activate. */
const mocks = vi.hoisted(() => ({ list: vi.fn(), setExpired: vi.fn() }));
vi.mock('@/hooks/use-inventory-list', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-inventory-list')>()),
  useMaterialList: (filters: unknown) => mocks.list(filters),
  useSetMaterialExpired: () => ({ mutate: mocks.setExpired, isPending: false }),
}));
vi.mock('@/lib/current-role', () => ({ currentRole: () => 'accountant' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));

const CLEANER = {
  id: 'm-1',
  item_code: 'FC-1',
  name: 'Floor cleaner',
  category: 'Housekeeping',
  unit: 'LITERS',
  current_stock: 5,
  minimum_stock: 2,
  unit_price: 120,
  location: null,
  created_at: '2026-09-01',
  is_active: false,
  expired_at: '2026-10-18T10:00:00Z',
  total_cost: '600.00',
};

describe('ExpiredInventory', () => {
  beforeEach(() => {
    mocks.list.mockReset().mockReturnValue({ isLoading: false, data: { data: [CLEANER], total: 1 } });
    mocks.setExpired.mockReset();
  });

  it('asks for the expired items and lists them with the day', () => {
    render(<ExpiredInventory />);
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'expired', page: 1 }));
    const headers = [...screen.getByRole('table').querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['S.No', 'Name', 'Quantity', 'Unit', 'Cost per unit', 'Total Cost', 'Expired On', 'Re-activate', 'More details']);
    expect(screen.getByText('Floor cleaner')).toBeTruthy();
  });

  it('re-activates an item after a confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ExpiredInventory />);
    fireEvent.click(screen.getByRole('button', { name: 'Re-activate' }));
    expect(mocks.setExpired).toHaveBeenCalledWith({ id: 'm-1', expired: false }, expect.anything());
  });

  it('says not available yet on an API that does not know expired items', () => {
    mocks.list.mockReturnValue({ isLoading: false, data: { data: [{ ...CLEANER, is_active: undefined }], total: 1 } });
    render(<ExpiredInventory />);
    expect(screen.getByText('Expired inventory is not available yet.')).toBeTruthy();
  });
});
