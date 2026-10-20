import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GridChange, GridRowState } from '@/components/editable-grid';
import { categoryChoices, type AssetCategory } from '@/hooks/use-asset-categories';
import { assetFormError, assetFormValues, assetPayload } from '../assets/asset-form-fields';
import { ASSET_TYPES } from '../assets/asset-ui';
import { AssetCategoriesContent } from './setup/asset-categories/asset-categories-content';
import {
  toAssetCategoryRows,
  validateAssetCategories,
  type AssetCategoryValues,
} from './setup/asset-categories/asset-categories-grid';

/**
 * Setup Asset Categories (ASSET-16, ASSET-S1): the grid's rows and checks,
 * the page before and after the API has categories, and the asset form
 * sending the category id instead of a fixed type.
 */

const mocks = vi.hoisted(() => ({ query: vi.fn(), save: vi.fn() }));
vi.mock('@/hooks/use-asset-categories', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-asset-categories')>()),
  useAssetCategories: () => mocks.query(),
  useSaveAssetCategories: () => ({ mutateAsync: mocks.save, isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
const role = vi.hoisted(() => ({ value: 'committee_member' }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => role.value }));

const category = (id: string, name: string, extra: Partial<AssetCategory> = {}): AssetCategory => ({
  id,
  name,
  is_active: true,
  sort_order: 1,
  legacy_type: null,
  depreciation_method: null,
  depreciation_rate: null,
  useful_life_years: null,
  residual_percent: '5.00',
  active_assets: 0,
  ...extra,
});

const row = (key: string, name: string, id?: string, inactive = false): GridRowState<AssetCategoryValues> =>
  ({ key, id, values: { name }, inactive }) as GridRowState<AssetCategoryValues>;

describe('asset categories grid', () => {
  it('sends the whole list in order, a retired row as is_active false', () => {
    const change = { rows: [row('a', ' Lifts ', 'c-1'), row('b', 'Pumps', 'c-2', true), row('c', 'Gym Equipment')] } as unknown as GridChange<AssetCategoryValues>;
    expect(toAssetCategoryRows(change)).toEqual([
      { id: 'c-1', name: 'Lifts', is_active: true },
      { id: 'c-2', name: 'Pumps', is_active: false },
      { name: 'Gym Equipment', is_active: true },
    ]);
  });

  it('names a repeated or emptied category, and skips blank spare rows', () => {
    expect(validateAssetCategories([row('a', 'Lifts', 'c-1'), row('b', 'lifts'), row('c', '', 'c-3'), row('d', '')])).toEqual({
      b: '"lifts" is already in the list.',
      c: 'Enter the category.',
    });
  });
});

describe('Setup Asset Categories page', () => {
  beforeEach(() => {
    role.value = 'committee_member';
    mocks.query.mockReset();
  });

  it('lists the society’s categories in an editable grid with ten spare rows', () => {
    mocks.query.mockReturnValue({ isLoading: false, data: [category('c-1', 'Elevator'), category('c-2', 'Gym Equipment', { is_active: false })], dataUpdatedAt: 1 });
    render(<AssetCategoriesContent />);
    expect(screen.getByDisplayValue('Elevator')).toBeTruthy();
    expect(screen.getByDisplayValue('Gym Equipment')).toBeTruthy();
    expect(screen.getAllByRole('textbox')).toHaveLength(12);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeTruthy();
  });

  it('shows the fixed list read only before the API has categories', () => {
    mocks.query.mockReturnValue({ isLoading: false, error: { status: 404 } });
    render(<AssetCategoriesContent />);
    expect(screen.getByText('Categories become editable in a later release.')).toBeTruthy();
    expect(screen.getByText('Elevator')).toBeTruthy();
  });

  it('is read only for a role that cannot edit the list', () => {
    role.value = 'accountant';
    mocks.query.mockReturnValue({ isLoading: false, data: [category('c-1', 'Elevator')], dataUpdatedAt: 1 });
    render(<AssetCategoriesContent />);
    expect(screen.queryByRole('button', { name: /save changes/i })).toBeNull();
  });
});

describe('asset form category (ASSET-16)', () => {
  it('offers the society’s categories by id, and the fixed types before the API has them', () => {
    const own = categoryChoices([category('c-9', 'Gym Equipment')], ASSET_TYPES);
    expect(own).toEqual({ byId: true, choices: [{ value: 'c-9', label: 'Gym Equipment', legacyType: null }] });
    expect(categoryChoices(undefined, ASSET_TYPES).byId).toBe(false);
  });

  it('sends the category id (not a fixed type) and asks for one', () => {
    const values = { ...assetFormValues(), name: 'Treadmill', location: 'Gym' };
    expect(assetFormError(values, true)).toBe('Choose the category.');
    const payload = assetPayload({ ...values, categoryId: 'c-9' }, true);
    expect(payload).toMatchObject({ category_id: 'c-9' });
    expect(payload).not.toHaveProperty('asset_type');
    expect(assetPayload(values, false)).toMatchObject({ asset_type: 'generator' });
  });
});
