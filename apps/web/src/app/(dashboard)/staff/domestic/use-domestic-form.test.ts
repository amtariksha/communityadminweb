import { describe, expect, it } from 'vitest';
import { recordDraftFrom } from '../employee-form/staff-record';
import { domesticDraftError, domesticDraftFrom, domesticPayload } from './use-domestic-form';

/** STAFF-42 — Add / Edit Household Help: what must be filled in and what is sent to /workers. */

const draft = (overrides: Partial<ReturnType<typeof domesticDraftFrom>> = {}) => ({
  ...domesticDraftFrom(null),
  name: 'Test Maid',
  phone: '0000000045',
  categoryId: 'cat-1',
  units: [{ id: 'unit-1', label: 'A - 101' }],
  ...overrides,
});

describe('household help form', () => {
  it('needs a name, a phone on Add, a Domestic category and at least one unit', () => {
    expect(domesticDraftError(draft(), false)).toBeNull();
    expect(domesticDraftError(draft({ name: ' ' }), false)?.title).toBe('Name is required');
    expect(domesticDraftError(draft({ phone: '' }), false)?.title).toBe('Invalid phone number');
    expect(domesticDraftError(draft({ phone: '' }), true)).toBeNull();
    expect(domesticDraftError(draft({ categoryId: '' }), false)?.title).toBe('Pick a category');
    expect(domesticDraftError(draft({ units: [] }), false)?.title).toBe('Pick a unit');
  });

  it('sends the category, the units and the record; the phone only on Add', () => {
    const record = { ...recordDraftFrom(null), badgeNo: '12' };
    const added = domesticPayload(draft({ address: ' Gate 2 lane ' }), record, false);
    expect(added).toMatchObject({ name: 'Test Maid', category_id: 'cat-1', unit_ids: ['unit-1'], address: 'Gate 2 lane', badge_no: '12', join_date: null });
    expect(String(added.phone)).toContain('0000000045');
    const edited = domesticPayload(draft(), record, true);
    expect(edited).not.toHaveProperty('phone');
    expect(edited).toHaveProperty('exit_date', null);
  });

  it('opens a saved helper with their flats', () => {
    const saved = domesticDraftFrom({
      id: 'w1', name: 'Test Driver', phone: '+910000000046', category: 'driver', category_id: 'cat-2', status: 'active',
      unit_ids: ['u1'], units: [{ id: 'u1', label: 'B - 201' }], badge_no: '7', badge_issued_on: null, badge_valid_until: null,
      gender: null, qualification: null, skills: null, languages: null, notes: null, address: null, id_proof_number: null,
      join_date: '2026-09-01', exit_date: null,
    });
    expect(saved).toMatchObject({ name: 'Test Driver', categoryId: 'cat-2', units: [{ id: 'u1', label: 'B - 201' }], joinedAt: '2026-09-01' });
  });
});
