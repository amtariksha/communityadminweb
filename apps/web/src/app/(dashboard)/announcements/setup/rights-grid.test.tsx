import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AnnouncementRightsRow } from '@/hooks';
import { RightsGrid } from './rights-grid';

/** ANN-S1 — Name · Approval · Set Expiry: Approval from the approver grid, Set Expiry ticked here. */

const ROWS: AnnouncementRightsRow[] = [
  { user_id: 'u1', name: 'Asha Menon', roles: ['committee_member'], approval_level: 1, can_approve: true, can_set_expiry: false },
  { user_id: 'u2', name: 'Ravi Shah', roles: ['accountant'], approval_level: 0, can_approve: false, can_set_expiry: true },
];

describe('RightsGrid', () => {
  it('shows each admin with Approval (and its level) and Set Expiry', () => {
    render(<RightsGrid rows={ROWS} expiry={{}} canEdit onExpiry={vi.fn()} />);

    expect((screen.getByLabelText('Asha Menon: Approval') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('Level 1')).toBeTruthy();
    expect((screen.getByLabelText('Ravi Shah: Set Expiry') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Asha Menon: Approval') as HTMLInputElement).disabled).toBe(true);
  });

  it('reports a Set Expiry tick', () => {
    const onExpiry = vi.fn();
    render(<RightsGrid rows={ROWS} expiry={{}} canEdit onExpiry={onExpiry} />);

    fireEvent.click(screen.getByLabelText('Asha Menon: Set Expiry'));

    expect(onExpiry).toHaveBeenCalledWith('u1', true);
  });

  it('follows the grid’s saved level over the loaded rights', () => {
    render(<RightsGrid rows={ROWS} expiry={{}} levels={{ u2: 2 }} canEdit onExpiry={vi.fn()} />);

    expect((screen.getByLabelText('Ravi Shah: Approval') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('Level 2')).toBeTruthy();
  });

  it('is read-only for someone who may not change it', () => {
    render(<RightsGrid rows={ROWS} expiry={{}} canEdit={false} onExpiry={vi.fn()} />);

    expect((screen.getByLabelText('Asha Menon: Set Expiry') as HTMLInputElement).disabled).toBe(true);
  });
});
