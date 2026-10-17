import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { ImportMembersResult, rowErrorsFromApiError } from './import-members-result';

/**
 * UNIT-04 — the paste-CSV dialog shows what happened to each row: the ones
 * that went in (with any note), the ones left out and why, and, when the
 * server refuses the whole file, which rows it objected to.
 */

describe('ImportMembersResult', () => {
  it('shows the counts and one line per skipped row, with its row number', () => {
    render(
      <ImportMembersResult
        result={{
          imported: 1,
          skipped: 1,
          errors: ['C-2: No owner to attach to'],
          results: [
            { row: 1, status: 'imported' },
            { row: 2, status: 'skipped', error: 'No owner to attach to' },
          ],
        }}
      />,
    );

    expect(screen.getByText('Imported: 1')).toBeTruthy();
    expect(screen.getByText('Skipped: 1')).toBeTruthy();
    expect(screen.getByText('Row 2: No owner to attach to')).toBeTruthy();
    expect(screen.queryByText('Row 1:', { exact: false })).toBeNull();
  });

  it('shows a note on a row that was imported', () => {
    render(
      <ImportMembersResult
        result={{
          imported: 1,
          skipped: 0,
          errors: [],
          results: [
            {
              row: 3,
              status: 'imported',
              note: 'Unit already has an intercom number; kept the existing one',
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText('Row 3: Unit already has an intercom number; kept the existing one'),
    ).toBeTruthy();
  });

  it('falls back to the plain error list from an API that sends no per-row results', () => {
    render(
      <ImportMembersResult
        result={{ imported: 0, skipped: 1, errors: ['A-1: Unit not found'] }}
      />,
    );

    expect(screen.getByText('A-1: Unit not found')).toBeTruthy();
  });

  it('lists the rows the server refused when it rejected the whole file', () => {
    render(
      <ImportMembersResult
        rowErrors={['Row 2: Resident type is not one of owner, owner_family, tenant, tenant_family']}
      />,
    );

    expect(
      screen.getByText('Row 2: Resident type is not one of owner, owner_family, tenant, tenant_family'),
    ).toBeTruthy();
  });
});

describe('rowErrorsFromApiError', () => {
  const refused = new ApiError(400, {
    statusCode: 400,
    message: 'Validation failed',
    errors: {
      'members.1.member_type': ['Invalid enum value'],
      'members.3.phone': ['Phone must be a 10-digit Indian mobile starting 6-9 (optional +91 prefix)'],
      'members.4': ['Give a unit number or a unit id'],
    },
  } as never);

  it('turns member paths into one-based row lines with a plain field name', () => {
    expect(rowErrorsFromApiError(refused)).toEqual([
      'Row 2: Resident type: Invalid enum value',
      'Row 4: Phone: Phone must be a 10-digit Indian mobile starting 6-9 (optional +91 prefix)',
      'Row 5: Give a unit number or a unit id',
    ]);
  });

  it('returns nothing for an error that is not about rows', () => {
    expect(rowErrorsFromApiError(new Error('network'))).toEqual([]);
    expect(
      rowErrorsFromApiError(
        new ApiError(400, { statusCode: 400, message: 'Nope', errors: { other: ['x'] } } as never),
      ),
    ).toEqual([]);
  });
});
