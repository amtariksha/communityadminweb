import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StockCatalogueTable } from './stock-catalogue-table';

/** Standard Stock Catalogue (ASSET-09): server search, paging and Total Cost. */

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/hooks/use-inventory-list', () => ({ useMaterialList: (filters: unknown) => mocks.list(filters) }));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T): T => value }));

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

describe('StockCatalogueTable', () => {
  beforeEach(() => mocks.list.mockReset().mockReturnValue({ isLoading: false, data: { data: [BULB], total: 60 } }));

  it('shows the Total Cost of each item and pages 25 of 60', () => {
    render(<StockCatalogueTable />);

    expect(screen.getByText('Total Cost')).toBeTruthy();
    expect(screen.getByText('₹250')).toBeTruthy();
    expect(screen.getByText(/Showing 1 to 25 of 60/)).toBeTruthy();
    expect(mocks.list).toHaveBeenLastCalledWith({ search: undefined, page: 1, limit: 25 });
  });

  it('searches on the server', () => {
    render(<StockCatalogueTable />);
    fireEvent.change(screen.getByLabelText('Search materials'), { target: { value: 'led' } });

    expect(mocks.list).toHaveBeenLastCalledWith({ search: 'led', page: 1, limit: 25 });
  });
});
