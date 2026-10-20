import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EntryReason } from '@/hooks/use-gate-lists';
import { EntryReasonsGrid, stayLabel, stayOptions } from './entry-reasons-grid';

/**
 * Gate & Visitors › Setup › Visitor Entry Reasons (GATE-41): reasons with an
 * expected stay edited in place and saved as one list; blank stay = society
 * default; a reason is retired, never deleted.
 */

const reason = (id: string, name: string, expected: number | null, over: Partial<EntryReason> = {}): EntryReason => ({
  id,
  name,
  expected_minutes: expected,
  is_active: true,
  sort_order: 1,
  ...over,
});

const REASONS = [reason('r1', 'Courier', 20), reason('r2', 'Guest', null)];
const cell = (header: string, row: number) => screen.getByLabelText(`${header}, row ${row}`) as HTMLInputElement;

describe('Visitor Entry Reasons grid', () => {
  it('saves a changed stay and a new reason in one request', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<EntryReasonsGrid reasons={REASONS} readOnly={false} isSaving={false} save={save} />);

    fireEvent.change(cell('Expected Stay', 2), { target: { value: '60' } });
    fireEvent.change(cell('Reason', 3), { target: { value: 'Maintenance' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    });

    expect(save).toHaveBeenCalledWith([
      { id: 'r1', name: 'Courier', expected_minutes: 20, is_active: true },
      { id: 'r2', name: 'Guest', expected_minutes: 60, is_active: true },
      { name: 'Maintenance', expected_minutes: null, is_active: true },
    ]);
  });

  it('refuses a name used twice before sending', async () => {
    const save = vi.fn();
    render(<EntryReasonsGrid reasons={REASONS} readOnly={false} isSaving={false} save={save} />);

    fireEvent.change(cell('Reason', 3), { target: { value: 'guest' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    });

    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Another reason already has this name.');
  });

  it('offers the stays in minutes and hours and keeps a saved value outside them', () => {
    expect(stayLabel(45)).toBe('45 min');
    expect(stayLabel(90)).toBe('1.5 hours');
    expect(stayLabel(60)).toBe('1 hour');
    const options = stayOptions([reason('r3', 'Official', 75)]);
    expect(options[0]).toEqual({ value: '', label: 'Society default' });
    expect(options.map((option) => option.value)).toContain('75');
  });
});
