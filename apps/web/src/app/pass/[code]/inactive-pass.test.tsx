import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InactivePassCard, passStampOf } from './inactive-pass';

const NOW = new Date('2026-10-20T10:00:00Z');

/** The public pass lookup returns only `{ status }` for a pass that can no longer be used. */
describe('pass stamp', () => {
  it('reads the status the API sends alone', () => {
    expect(passStampOf({ status: 'revoked' }, NOW)).toBe('REVOKED');
    expect(passStampOf({ status: 'expired' }, NOW)).toBe('EXPIRED');
    expect(passStampOf({ status: 'used' }, NOW)).toBe('USED');
    expect(passStampOf({ status: 'active', valid_until: '2026-10-20T20:00:00Z' }, NOW)).toBeNull();
  });

  it('still reads an older API that sent dates and counts', () => {
    expect(passStampOf({ status: undefined, valid_until: '2026-10-20T09:00:00Z' }, NOW)).toBe('EXPIRED');
    expect(passStampOf({ valid_until: '2026-10-20T20:00:00Z', entries_used: 1, max_entries: 1 }, NOW)).toBe('USED');
    expect(passStampOf({ valid_until: '2026-10-20T20:00:00Z', entries_used: 0, max_entries: 1 }, NOW)).toBeNull();
  });

  it('shows the stamp and a plain line, nothing of the pass', () => {
    render(<InactivePassCard stamp="USED" />);
    expect(screen.getByText('USED')).toBeTruthy();
    expect(screen.getByText('This pass has already been used.')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
