import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryItem } from './inventory/[id]/inventory-item';

/** Inventory › More details (ASSET-11, ASSET-12): Edit, Create PO from the item, Mark Expired. */
const mocks = vi.hoisted(() => ({ item: vi.fn(), setExpired: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'm-1' }) }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/hooks/use-inventory-list', () => ({
  useMaterialItem: () => mocks.item(),
  useMaterialMovements: () => ({ data: [], isLoading: false }),
  useSetMaterialExpired: () => ({ mutate: mocks.setExpired, isPending: false }),
}));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => null }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => 'committee_member' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../inventory/edit-material-dialog', () => ({ EditMaterialDialog: (): ReactNode => <div>Edit form</div> }));
vi.mock('../inventory/stock-movement-dialog', () => ({ StockMovementDialog: (): ReactNode => null }));
vi.mock('../inventory/create-po-dialog', () => ({
  CreatePoDialog: ({ prefill }: { prefill?: { vendor_name: string; total_amount: number } }): ReactNode => (
    <div>PO for {prefill?.vendor_name} at {prefill?.total_amount}</div>
  ),
}));

const BULB = {
  id: 'm-1',
  item_code: 'BULB-9W',
  name: 'LED bulb 9W',
  category: 'Electrical',
  unit: 'PCS',
  current_stock: 10,
  minimum_stock: 5,
  unit_price: '25.00',
  location: null,
  created_at: '2026-10-01',
  vendor_name: 'Vendor A',
  reorder_quantity: '20.00',
  is_active: true,
};

describe('InventoryItem', () => {
  beforeEach(() => {
    mocks.item.mockReturnValue({ isLoading: false, data: BULB });
    mocks.setExpired.mockReset();
  });

  it('shows the vendor and re-order quantity, opens Edit and a purchase order prefilled from the item', () => {
    render(<InventoryItem />);
    expect(screen.getByText('Vendor A')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Edit form')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create PO' }));
    expect(screen.getByText('PO for Vendor A at 500')).toBeTruthy();
  });

  it('marks the item expired after a confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<InventoryItem />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark Expired' }));
    expect(mocks.setExpired).toHaveBeenCalledWith({ id: 'm-1', expired: true }, expect.anything());
  });

  it('offers no Add/Remove on an expired item, only Re-activate', () => {
    mocks.item.mockReturnValue({ isLoading: false, data: { ...BULB, is_active: false, expired_at: '2026-10-18T10:00:00Z' } });
    render(<InventoryItem />);
    expect(screen.queryByRole('button', { name: 'Add/Remove' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Re-activate' })).toBeTruthy();
    expect(screen.getByText(/Expired on/)).toBeTruthy();
  });
});
