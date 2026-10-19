import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { Shift } from '@/hooks/use-staff';
import { ShiftsGrid, hoursBetween, shiftEnds } from './shifts-grid';

/**
 * Staff Shift Management as an editable grid (STAFF-11, SB-08): shifts are
 * name, start and hours with Ends worked out; every change goes in one
 * save; a retired shift in use comes back as an error on its row.
 */

const shift = (id: string, name: string, start: string, end: string, active = true): Shift => ({
  id,
  tenant_id: 't',
  name,
  start_time: `${start}:00`,
  end_time: `${end}:00`,
  is_active: active,
  created_at: '2026-10-01T00:00:00Z',
});

const SHIFTS = [shift('s1', 'Morning', '06:00', '14:00'), shift('s2', 'Night', '22:00', '06:00')];

function renderGrid(save = vi.fn().mockResolvedValue(undefined)) {
  render(<ShiftsGrid shifts={SHIFTS} readOnly={false} isSaving={false} save={save} />);
  return save;
}

const cell = (header: string, row: number) => screen.getByLabelText(`${header}, row ${row}`) as HTMLInputElement;
const type = (header: string, row: number, value: string) => fireEvent.change(cell(header, row), { target: { value } });
const saveChanges = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  });
};

describe('Shifts grid', () => {
  it('shows each shift with its hours and end, a night shift wrapping past midnight', () => {
    renderGrid();

    expect(cell('Shift Name', 1).value).toBe('Morning');
    expect(cell('Shift Hours', 2).value).toBe('8');
    expect(screen.getByRole('table', { name: 'Shifts' }).textContent).toContain('06:00');
  });

  it('saves two edited shifts and a new one in one request', async () => {
    const save = renderGrid();

    type('Shift Name', 1, 'Early Morning');
    type('Shift Hours', 2, '8.5');
    type('Shift Name', 3, 'Evening');
    type('Shift Start Time', 3, '14:00');
    type('Shift Hours', 3, '8');
    await saveChanges();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith([
      { id: 's1', name: 'Early Morning', start_time: '06:00', hours: 8, is_active: true },
      { id: 's2', name: 'Night', start_time: '22:00', hours: 8.5, is_active: true },
      { name: 'Evening', start_time: '14:00', hours: 8, is_active: true },
    ]);
  });

  it('retires a shift instead of deleting it', async () => {
    const save = renderGrid();

    fireEvent.click(screen.getByRole('button', { name: 'Retire row 1' }));
    await saveChanges();

    expect(save.mock.calls[0][0][0]).toEqual({ id: 's1', name: 'Morning', start_time: '06:00', hours: 8, is_active: false });
  });

  it('refuses hours off the half-hour steps before sending', async () => {
    const save = renderGrid();

    type('Shift Hours', 1, '7.25');
    await saveChanges();

    expect(screen.getByText('Shift hours are 0.5 to 24, in steps of 0.5.')).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });

  it('shows the server’s shift_in_use refusal on its row', async () => {
    const refusal = new ApiError(409, {
      message: 'A shift in use cannot be retired. Nothing was changed.',
      code: 'shift_in_use',
      errors: { 'rows.0.is_active': ['Staff are assigned to this shift. End their assignments first.'] },
    } as never);
    renderGrid(vi.fn().mockRejectedValue(refusal));

    fireEvent.click(screen.getByRole('button', { name: 'Retire row 1' }));
    await saveChanges();

    expect(screen.getByRole('alert').textContent).toBe('Staff are assigned to this shift. End their assignments first.');
  });
});

describe('shift times', () => {
  it('reads hours from start and end and works the end out', () => {
    expect(hoursBetween('22:00:00', '06:00:00')).toBe(8);
    expect(hoursBetween('07:00', '07:00')).toBe(24);
    expect(shiftEnds({ name: 'A', start: '22:00', hours: '8' })).toBe('06:00');
    expect(shiftEnds({ name: 'A', start: '', hours: '8' })).toBe('');
  });
});
