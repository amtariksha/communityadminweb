import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AmcAssetsField } from './amc-assets-field';
import type { AmcFormValues } from './amc-form-values';

/**
 * The AMC asset picker loaded one page of 100 assets of the category, so in
 * a bigger category the rest could not be covered. It now says how many are
 * shown and searches the server for the others.
 */

const register = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-asset-register', () => ({ useAssetRegister: (filters: unknown) => register(filters) }));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));

const values = { categoryId: 'cat-ext', assetIds: ['a-0'] } as unknown as AmcFormValues;
const page = (count: number, total: number) => ({
  data: { data: Array.from({ length: count }, (_, i) => ({ id: `a-${i}`, name: `Extinguisher ${i}`, location: null })), total },
});

describe('AMC assets field', () => {
  it('names how many of the category are shown and searches the server for the rest', () => {
    register.mockImplementation((filters: { search?: string }) => (filters.search ? page(1, 1) : page(100, 140)));
    render(<AmcAssetsField values={values} set={vi.fn()} />);

    expect(screen.getByText('Showing 100 of 140. Search to find the others.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'Tower C' } });

    expect(register).toHaveBeenLastCalledWith({ category: 'cat-ext', search: 'Tower C', page: 1, limit: 100 });
    expect(screen.getByText('1 asset(s) covered.')).toBeTruthy();
  });

  it('offers no search when the whole category fits', () => {
    register.mockReturnValue(page(3, 3));
    render(<AmcAssetsField values={values} set={vi.fn()} />);
    expect(screen.queryByLabelText('Search assets')).toBeNull();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });
});
