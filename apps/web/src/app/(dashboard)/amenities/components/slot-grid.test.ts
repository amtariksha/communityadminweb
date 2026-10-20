import { describe, expect, it } from 'vitest';
import type { GridChange, GridRowState } from '@/components/editable-grid';
import { savedSlotRows, toSlotRows, validateSlots, type SlotValues } from './slot-grid';
import { slotLabel } from './booking-fields';

/** AMEN-20 — the slot grid's rows and what it saves; the Reserve form's slot labels. */

const row = (values: Partial<SlotValues>, extra: Partial<GridRowState<SlotValues>> = {}): GridRowState<SlotValues> => ({
  key: extra.key ?? 'r1',
  values: { name: '', cost: '', day: '', start: '', end: '', ...values },
  inactive: false,
  ...extra,
});

describe('slot grid', () => {
  it('reads the saved slots, retired ones marked', () => {
    expect(
      savedSlotRows([
        { id: 's1', amenity_id: 'a', name: 'Morning', cost: '500.00', day_of_week: null, start_time: '06:00:00', end_time: '09:00:00', is_active: true, display_order: 1 },
        { id: 's2', amenity_id: 'a', name: null, cost: null, day_of_week: 0, start_time: '18:00:00', end_time: '21:00:00', is_active: false, display_order: 2 },
      ]),
    ).toEqual([
      { id: 's1', inactive: false, values: { name: 'Morning', cost: '500.00', day: '', start: '06:00', end: '09:00' } },
      { id: 's2', inactive: true, values: { name: '', cost: '', day: '0', start: '18:00', end: '21:00' } },
    ]);
  });

  it('asks for times that make a window, and ignores untouched spare rows', () => {
    expect(
      validateSlots([
        row({ name: 'Evening', start: '18:00', end: '17:00' }, { key: 'bad' }),
        row({ name: 'Late', start: '22:00', end: '00:00' }, { key: 'midnight' }),
        row({}, { key: 'spare' }),
      ]),
    ).toEqual({ bad: 'The end must be after the start.' });
  });

  it('saves each row whole, a blank cost as none and a retired row as inactive', () => {
    const change: GridChange<SlotValues> = {
      rows: [
        { key: 'a', id: 's1', values: { name: ' Morning ', cost: '500', day: '', start: '06:00', end: '09:00' }, inactive: false, position: 1, changed: true },
        { key: 'b', values: { name: '', cost: '', day: '6', start: '18:00', end: '21:00' }, inactive: true, position: 2, changed: true },
      ],
      upserts: [],
      deactivations: [],
    };
    expect(toSlotRows(change)).toEqual([
      { id: 's1', name: 'Morning', cost: 500, day_of_week: null, start_time: '06:00', end_time: '09:00', is_active: true },
      { name: null, cost: null, day_of_week: 6, start_time: '18:00', end_time: '21:00', is_active: false },
    ]);
  });

  it('labels a slot with its name, times, cost and whether it is taken', () => {
    expect(slotLabel({ id: 's1', name: 'Evening', cost: '800.00', start_time: '18:00:00', end_time: '21:00:00', is_available: false })).toBe(
      'Evening 18:00–21:00 · ₹800 (taken)',
    );
  });
});
