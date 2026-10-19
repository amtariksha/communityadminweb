import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { applyImportResult, applyRequestErrors, blankRow, blankRows, prepareImport, type AddUserRow } from './add-users-rows';

/** Add Users (UNIT-14): which rows go, what is sent, and what each row shows after. */

function filled(overrides: Partial<AddUserRow> = {}): AddUserRow {
  return { ...blankRow(), firstName: 'Test', lastName: 'Resident', unitId: 'u-1', phone: '98765 43210', residentType: 'tenant', ...overrides };
}

describe('prepareImport', () => {
  it('sends the filled rows only, with one name and the phone in +91 form', () => {
    const rows = [filled(), ...blankRows(2), filled({ firstName: 'Second', lastName: '', email: 'second@example.test', intercom: '204' })];

    const prepared = prepareImport(rows);

    expect(prepared.members).toEqual([
      { unit_id: 'u-1', name: 'Test Resident', phone: '+919876543210', member_type: 'tenant' },
      { unit_id: 'u-1', name: 'Second', phone: '+919876543210', member_type: 'tenant', email: 'second@example.test', intercom: '204' },
    ]);
    expect(prepared.sentKeys).toEqual([rows[0].key, rows[3].key]);
  });

  it('keeps a row that is incomplete or wrong, with what to fix, and does not send it', () => {
    const rows = [filled({ unitId: '', residentType: '' }), filled({ phone: '12345' }), filled({ email: 'nope' }), filled()];

    const prepared = prepareImport(rows);

    expect(prepared.members).toHaveLength(1);
    expect(prepared.rows[0].result).toEqual({ tone: 'error', text: 'Fill in Unit No, Resident Type.' });
    expect(prepared.rows[1].result?.tone).toBe('error');
    expect(prepared.rows[2].result?.text).toBe('Email Address is not valid.');
    expect(prepared.rows[3].result).toBeUndefined();
  });
});

describe('applyImportResult', () => {
  it('clears the rows that were created and keeps the values of the ones that were not', () => {
    const rows = [filled({ firstName: 'Made' }), filled({ firstName: 'Refused' })];
    const sentKeys = rows.map((row) => row.key);

    const next = applyImportResult(rows, sentKeys, {
      imported: 1,
      skipped: 1,
      errors: [],
      results: [
        { row: 1, status: 'imported' },
        { row: 2, status: 'skipped', error: 'Already a current member of this unit' },
      ],
    });

    expect(next[0]).toMatchObject({ firstName: '', unitId: '', result: { tone: 'success', text: 'Created' } });
    expect(next[1]).toMatchObject({ firstName: 'Refused', result: { tone: 'error', text: 'Already a current member of this unit' } });
  });

  it('shows a note on a created row (e.g. the unit kept its own intercom)', () => {
    const rows = [filled()];

    const next = applyImportResult(rows, [rows[0].key], {
      imported: 1,
      skipped: 0,
      errors: [],
      results: [{ row: 1, status: 'imported', note: 'Unit already has an intercom number' }],
    });

    expect(next[0].result).toEqual({ tone: 'note', text: 'Created. Unit already has an intercom number' });
  });
});

describe('applyRequestErrors', () => {
  it("puts a 400's row errors on the rows it names", () => {
    const rows = [filled(), filled()];
    const error = new ApiError(400, { message: 'Validation failed', errors: { 'members.1.name': ['Name must be at least 2 characters'] } } as never);

    const next = applyRequestErrors(rows, rows.map((row) => row.key), error);

    expect(next?.[0].result).toBeUndefined();
    expect(next?.[1].result).toEqual({ tone: 'error', text: 'Name must be at least 2 characters' });
  });

  it('leaves other failures to the page', () => {
    expect(applyRequestErrors([filled()], ['x'], new ApiError(500, { message: 'boom' } as never))).toBeNull();
  });
});
