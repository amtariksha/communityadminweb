import { describe, expect, it } from 'vitest';
import type { GridRowState } from '@/components/editable-grid';
import { savedTicketTypeRows, toTicketTypeRows, validateTicketTypes, type TicketTypeValues } from './ticket-type-grid';

/** AMEN-43 — an event's ticket types: what the grid reads, checks and saves. */

const row = (values: Partial<TicketTypeValues>, key = 'r'): GridRowState<TicketTypeValues> => ({
  key, values: { slot: '', memberPrice: '', guestPrice: '', capacity: '', sold: 0, ...values }, inactive: false,
});

describe('ticket type grid', () => {
  it('reads the saved types with what is sold', () => {
    expect(
      savedTicketTypeRows([{ id: 't1', event_id: 'e', slot_label: 'Evening', member_price: '200.00', guest_price: '300.00', capacity: null, is_active: true, display_order: 1, sold: 3 }]),
    ).toEqual([{ id: 't1', inactive: false, values: { slot: 'Evening', memberPrice: '200.00', guestPrice: '300.00', capacity: '', sold: 3 } }]);
  });

  it('needs a slot name and a whole capacity above 0', () => {
    expect(validateTicketTypes([row({ memberPrice: '200' }, 'a'), row({ slot: 'Evening', capacity: '0' }, 'b'), row({}, 'spare')])).toEqual({
      a: 'Name the slot.',
      b: 'Capacity is a whole number above 0.',
    });
  });

  it('saves blank prices as free and a blank capacity as no limit', () => {
    expect(
      toTicketTypeRows({
        rows: [{ key: 'k', values: { slot: ' Evening ', memberPrice: '200', guestPrice: '', capacity: '', sold: 0 }, inactive: false, position: 1, changed: true }],
        upserts: [],
        deactivations: [],
      }),
    ).toEqual([{ slot_label: 'Evening', member_price: 200, guest_price: 0, capacity: null, is_active: true }]);
  });
});
