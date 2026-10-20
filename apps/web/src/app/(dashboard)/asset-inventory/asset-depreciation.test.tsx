import { describe, expect, it } from 'vitest';
import type { GridChange, GridRowState } from '@/components/editable-grid';
import type { AssetCategory } from '@/hooks/use-asset-categories';
import type { Asset } from '@/hooks/use-assets';
import { assetFormError, assetFormValues, assetPayload } from '../assets/asset-form-fields';
import {
  categoryValues,
  toAssetCategoryRows,
  validateAssetCategories,
  type AssetCategoryValues,
} from './setup/asset-categories/asset-categories-grid';

/** Depreciation inputs (ASSET-19): the category grid's columns and the asset's own overrides. */

const values = (patch: Partial<AssetCategoryValues>): AssetCategoryValues => ({ name: 'Elevator', method: '', rate: '', life: '', residual: '5', ...patch });
const row = (key: string, patch: Partial<AssetCategoryValues>, id?: string): GridRowState<AssetCategoryValues> =>
  ({ key, id, values: values(patch), inactive: false }) as GridRowState<AssetCategoryValues>;

describe('category depreciation columns', () => {
  it('opens a stored category with its inputs', () => {
    const stored = {
      id: 'c-1',
      name: 'Elevator',
      depreciation_method: 'slm',
      depreciation_rate: null,
      useful_life_years: 15,
      residual_percent: '5.00',
    } as AssetCategory;
    expect(categoryValues(stored)).toEqual({ name: 'Elevator', method: 'slm', rate: '', life: '15', residual: '5' });
  });

  it('sends method, rate, life and residual; blanks as not set', () => {
    const change = { rows: [row('a', { method: 'wdv', rate: '15' }, 'c-1'), row('b', { name: 'Gym', residual: '' })] } as unknown as GridChange<AssetCategoryValues>;
    expect(toAssetCategoryRows(change)).toEqual([
      { id: 'c-1', name: 'Elevator', is_active: true, depreciation_method: 'wdv', depreciation_rate: 15, useful_life_years: null, residual_percent: 5 },
      { name: 'Gym', is_active: true, depreciation_method: null, depreciation_rate: null, useful_life_years: null, residual_percent: 5 },
    ]);
  });

  it('names a rate, life or residual out of range, and written-down value with neither', () => {
    expect(
      validateAssetCategories([
        row('a', { name: 'A', rate: '120' }),
        row('b', { name: 'B', life: '2.5' }),
        row('c', { name: 'C', residual: '100' }),
        row('d', { name: 'D', method: 'wdv' }),
        row('e', { name: 'E', method: 'slm', life: '10' }),
      ]),
    ).toEqual({
      a: 'The rate is more than 0 and at most 100%.',
      b: 'The useful life is 1 to 100 whole years.',
      c: 'The residual value is 0 to 99.99% of cost.',
      d: 'Written-down value needs a rate or a useful life.',
    });
  });
});

describe('asset depreciation overrides', () => {
  it('sends blanks as null (the category’s) and typed inputs as numbers', () => {
    const blank = { ...assetFormValues(), name: 'Lift', location: 'Tower A' };
    expect(assetPayload(blank)).toMatchObject({
      depreciation_method: null,
      depreciation_rate: null,
      useful_life_years: null,
      residual_percent: null,
      depreciation_start_date: null,
    });
    const own = { ...blank, depMethod: 'wdv', depRate: '15', depStart: '2025-04-01' };
    expect(assetPayload(own)).toMatchObject({ depreciation_method: 'wdv', depreciation_rate: 15, depreciation_start_date: '2025-04-01' });
  });

  it('opens a stored asset with its own inputs, and checks them', () => {
    const asset = { id: 'a', name: 'DG', depreciation_method: 'wdv', depreciation_rate: '15.00', useful_life_years: null } as Asset;
    expect(assetFormValues(asset)).toMatchObject({ depMethod: 'wdv', depRate: '15', depLife: '' });
    expect(assetFormError({ ...assetFormValues(asset), name: 'DG', location: 'Yard', depLife: '0' })).toBe('The useful life is 1 to 100 whole years.');
  });
});
