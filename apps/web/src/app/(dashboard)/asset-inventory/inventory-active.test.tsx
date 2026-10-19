import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryList } from './inventory/inventory-list';

/**
 * Inventory › Active (ASSET-09): money per row, Below re-order, Add/Remove
 * and More details on the row, search on the server.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T): T => value }));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => 'committee_member' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../inventory/add-material-dialog', () => ({ AddMaterialDialog: (): ReactNode => null }));

const mocks = vi.hoisted(() => ({ list: vi.fn(), record: vi.fn() }));
vi.mock('@/hooks/use-inventory-list', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-inventory-list')>()),
  useMaterialList: (filters: unknown) => mocks.list(filters),
  useAddRemoveStock: () => ({ mutateAsync: mocks.record, isPending: false }),
}));

const BULB = {
  id: 'm-1',
  item_code: 'BULB-9W',
  name: 'LED bulb 9W',
  category: 'Electrical',
  unit: 'nos',
  current_stock: 10,
  minimum_stock: 5,
  unit_price: 25,
  location: null,
  created_at: '2026-10-01',
  total_cost: '250.00',
};

describe('InventoryList', () => {
  beforeEach(() => {
    mocks.record.mockReset().mockResolvedValue({});
    mocks.list.mockReset().mockReturnValue({ isLoading: false, data: { data: [BULB, { ...BULB, id: 'm-2', name: 'Tape', current_stock: 2, total_cost: '50.00' }], total: 60 } });
  });

  it('shows Total Cost, the re-order badge and the pager', () => {
    render(<InventoryList />);

    expect(screen.getByText('₹250')).toBeTruthy();
    expect(screen.getAllByText('Below re-order')).toHaveLength(1);
    expect(screen.getByText(/Showing 1 to 25 of 60/)).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'More details' })[0].getAttribute('href')).toBe('/asset-inventory/inventory/m-1');
  });

  it('Remove 4 records an OUT movement of 4 for that item', async () => {
    render(<InventoryList />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Remove' })[0]);
    fireEvent.click(screen.getByLabelText('Remove'));
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(mocks.record).toHaveBeenCalled());
    expect(mocks.record.mock.calls[0][0]).toMatchObject({ material_id: 'm-1', movement_type: 'OUT', quantity: 4 });
  });

  it('refuses removing more than is in stock before asking the server', () => {
    render(<InventoryList />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Remove' })[0]);
    fireEvent.click(screen.getByLabelText('Remove'));
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(mocks.record).not.toHaveBeenCalled();
  });

  it('searches on the server', () => {
    render(<InventoryList />);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'bulb' } });

    expect(mocks.list).toHaveBeenLastCalledWith({ search: 'bulb', page: 1, limit: 25 });
  });
});
