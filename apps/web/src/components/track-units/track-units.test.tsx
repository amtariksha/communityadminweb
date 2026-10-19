import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrackUnitList, TrackUnitSaveRow } from '@/hooks/use-track-units';
import { newUnitInput } from './add-unit-dialog';
import { blockChoices } from './rename-unit-form';
import { TrackUnitsContent } from './track-units-content';
import { parseArea, rowErrorsFromSave, toGridRows } from './track-units-state';

/** INC-37 — Track Units grid: dirty rows only, per-row errors; INC-49 — Delete on never-used units. */

const TENANT = '11111111-1111-4111-8111-111111111111';
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  list: null as unknown as TrackUnitList,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/block-links', () => ({ UnitBlockLinks: () => null }));
vi.mock('@/hooks/use-unit-billing-categories', () => ({
  unitBillingCategoryKeys: { all: ['unit-billing-categories'] },
  useUnitBillingCategories: () => ({
    data: { data: [{ id: 'type-1', name: '3 BHK', gst_threshold_applies: true, sort_order: 0, unit_count: 1, total_sqft1: 0, total_sqft2: 0 }] },
  }),
}));
vi.mock('@/hooks/use-track-units', () => ({
  useTrackUnits: () => ({ data: mocks.list, error: null, isLoading: false }),
  useSaveTrackUnits: () => ({ mutateAsync: mocks.save, isPending: false }),
  useUnusedUnits: () => ({ data: [], error: null, isLoading: false }),
  useDeleteUnusedUnit: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/use-units', () => ({ useCreateUnit: () => ({ mutate: vi.fn(), isPending: false }) }));

const row = (id: string, unit: string, extra: Partial<TrackUnitList['data'][number]> = {}) => ({
  id,
  unit_number: unit,
  block: 'A',
  is_active: true,
  billing_category_id: null,
  area_sqft: '1000.00',
  garden_area: null,
  primary_contact_name: `Owner ${unit}`,
  deletable: false,
  ...extra,
});

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'me', name: 'Me', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: TENANT, name: 'Green Acres', role }] }),
  );
}

beforeEach(() => {
  mocks.list = {
    data: [row('u1', '101'), row('u2', '102'), row('u3', '103'), row('u4', '104', { deletable: true, primary_contact_name: null })],
    totals: { units: 4, total_sqft1: 4000, total_sqft2: 0 },
  };
  signIn('community_admin');
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Track Units state', () => {
  it('shows each unit with its block and areas as typed text', () => {
    expect(toGridRows(mocks.list)[0]).toEqual({
      id: 'u1',
      values: { unit: 'A-101', contact: 'Owner 101', deletable: false, category: '', sqft1: '1000', sqft2: '' },
    });
    expect(parseArea(' 12.5 ')).toBe(12.5);
    expect(parseArea('')).toBeNull();
    expect(parseArea('abc')).toBeNull();
  });

  it('puts the server’s errors on the rows that were sent', () => {
    expect(rowErrorsFromSave({ updated: [], errors: { 'rows.1.area_sqft': ['Sq.ft 1 must be more than 0'] } }, ['k0', 'k1'])).toEqual({
      k1: 'Sq.ft 1 must be more than 0',
    });
  });

  it('builds the create-unit request with today’s Add Unit rules', () => {
    expect(newUnitInput({ unitNumber: '105', block: ' a ', floor: '1', area: '900' })).toEqual({
      ok: true,
      input: { unit_number: '105', block: 'A', floor: 1, area_sqft: 900, unit_type: 'residential' },
    });
    expect(newUnitInput({ unitNumber: '105', block: '', floor: '1', area: '900' }).ok).toBe(false);
    expect(newUnitInput({ unitNumber: '105', block: 'A', floor: '1.5', area: '900' }).ok).toBe(false);
  });

  it('offers the unit’s own block on Rename even when the block master lacks it', () => {
    expect(blockChoices(['A', 'B'], 'OLD')).toEqual(['OLD', 'A', 'B']);
    expect(blockChoices(['A', 'B'], 'A')).toEqual(['A', 'B']);
  });
});

describe('Track Units grid (INC-S13)', () => {
  it('saves exactly the three changed rows in one request and shows the refused row’s error', async () => {
    mocks.save.mockResolvedValue({ updated: ['u1', 'u3'], errors: { 'rows.1.area_sqft': ['Sq.ft 1 must be more than 0'] } });
    render(<TrackUnitsContent />);
    const grid = screen.getByRole('table', { name: 'Units' });
    fireEvent.change(within(grid).getByLabelText('Sq.ft 1, row 1'), { target: { value: '1200' } });
    fireEvent.change(within(grid).getByLabelText('Sq.ft 1, row 2'), { target: { value: '0' } });
    fireEvent.click(within(grid).getByLabelText('3 BHK, A-103'));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    const sent = mocks.save.mock.calls[0][0] as TrackUnitSaveRow[];
    expect(sent).toEqual([
      { id: 'u1', billing_category_id: null, area_sqft: 1200, garden_area: null },
      { id: 'u2', billing_category_id: null, area_sqft: 0, garden_area: null },
      { id: 'u3', billing_category_id: 'type-1', area_sqft: 1000, garden_area: null },
    ]);
    expect(await within(grid).findByText('Sq.ft 1 must be more than 0')).toBeTruthy();
  });

  it('shows the column order with a radio column per unit type and Delete only on never-used units', () => {
    render(<TrackUnitsContent />);
    const grid = screen.getByRole('table', { name: 'Units' });
    expect(within(grid).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'S.No', 'Unit', '3 BHK', 'Sq.ft 1', 'Sq.ft 2', 'Primary Contact', 'Rename', 'Delete', 'More',
    ]);
    expect(within(grid).getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
    expect(screen.getByText('Total Sq.ft 1 : 4,000 · Total Sq.ft 2 : 0')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete Un-Used Unit' })).toBeTruthy();
  });

  it('keeps Delete Un-Used Unit from an accountant (community admin only)', () => {
    signIn('accountant');
    render(<TrackUnitsContent />);
    expect(screen.getByRole('button', { name: 'Add Missing Unit' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete Un-Used Unit' })).toBeNull();
    expect(within(screen.getByRole('table', { name: 'Units' })).queryByRole('button', { name: 'Delete' })).toBeNull();
  });
});
