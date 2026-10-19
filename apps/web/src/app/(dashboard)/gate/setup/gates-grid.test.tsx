import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { Gate } from '@/hooks/use-staff';
import { gateDirectionLabel } from '@/hooks/use-gate-grid';
import { GatesGrid } from './gates-grid';

/**
 * Gate & Visitors › Setup › Gates (GATE-20, SB-08): each gate In, Out or
 * both, edited in place and saved in one request; a gate with neither is
 * refused before sending; a gate is retired, never deleted.
 */

const gate = (id: string, name: string, over: Partial<Gate> = {}): Gate => ({
  id,
  tenant_id: 't',
  name,
  location: null,
  gate_type: 'vehicle_and_pedestrian',
  is_active: true,
  allows_entry: true,
  allows_exit: true,
  created_at: '2026-10-01T00:00:00Z',
  ...over,
});

const GATES = [gate('g1', 'Main Gate', { location: 'North' }), gate('g2', 'Back Gate', { allows_exit: false, gate_type: 'pedestrian_only' })];

function renderGrid(save = vi.fn().mockResolvedValue(undefined), gates: Gate[] = GATES) {
  render(<GatesGrid gates={gates} readOnly={false} isSaving={false} save={save} />);
  return save;
}

const cell = (header: string, row: number) => screen.getByLabelText(`${header}, row ${row}`) as HTMLInputElement;
const type = (header: string, row: number, value: string) => fireEvent.change(cell(header, row), { target: { value } });
const saveChanges = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  });
};

describe('Gates grid', () => {
  it('shows each gate with its In and Out ticks', () => {
    renderGrid();

    expect(cell('Gate Name', 1).value).toBe('Main Gate');
    expect(cell('In', 2).checked).toBe(true);
    expect(cell('Out', 2).checked).toBe(false);
    // 5 spare rows after the two gates.
    expect(screen.getByLabelText('Gate Name, row 7')).toBeTruthy();
  });

  it('saves an edit and a new gate in one request', async () => {
    const save = renderGrid();

    fireEvent.click(cell('Out', 1));
    type('Gate Name', 3, 'Service Gate');
    type('Type', 3, 'service');
    await saveChanges();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith([
      { id: 'g1', name: 'Main Gate', location: 'North', gate_type: 'vehicle_and_pedestrian', allows_entry: true, allows_exit: false, is_active: true },
      { id: 'g2', name: 'Back Gate', location: null, gate_type: 'pedestrian_only', allows_entry: true, allows_exit: false, is_active: true },
      { name: 'Service Gate', location: null, gate_type: 'service', allows_entry: true, allows_exit: true, is_active: true },
    ]);
  });

  it('refuses an active gate with neither In nor Out before sending', async () => {
    const save = renderGrid();

    fireEvent.click(cell('In', 2));
    await saveChanges();

    expect(screen.getByRole('alert').textContent).toBe('Tick In, Out or both for an active gate.');
    expect(save).not.toHaveBeenCalled();
  });

  it('refuses a name used twice, ignoring case', async () => {
    const save = renderGrid();

    type('Gate Name', 3, 'main gate');
    await saveChanges();

    expect(screen.getByRole('alert').textContent).toBe('Another gate already has this name.');
    expect(save).not.toHaveBeenCalled();
  });

  it('retires a gate instead of deleting it', async () => {
    const save = renderGrid();

    fireEvent.click(screen.getByRole('button', { name: 'Retire row 2' }));
    await saveChanges();

    expect(save.mock.calls[0][0][1]).toMatchObject({ id: 'g2', is_active: false });
  });

  it('shows the server’s refusal on its row', async () => {
    const refusal = new ApiError(400, {
      message: 'One row could not be saved. Nothing was changed.',
      code: 'bulk_rows_invalid',
      errors: { 'rows.1.allows_entry': ['Tick In, Out or both for an active gate.'] },
    } as never);
    renderGrid(vi.fn().mockRejectedValue(refusal));

    type('Location', 2, 'East');
    await saveChanges();

    expect(screen.getByRole('alert').textContent).toBe('Tick In, Out or both for an active gate.');
  });

  it('reads a gate from an older API as In and Out', () => {
    renderGrid(vi.fn(), [{ ...gate('g1', 'Main Gate'), allows_entry: undefined, allows_exit: undefined }]);

    expect(cell('In', 1).checked).toBe(true);
    expect(cell('Out', 1).checked).toBe(true);
  });
});

describe('gateDirectionLabel', () => {
  it('names the directions', () => {
    expect(gateDirectionLabel({ allows_entry: true, allows_exit: true })).toBe('In & Out');
    expect(gateDirectionLabel({ allows_entry: true, allows_exit: false })).toBe('In only');
    expect(gateDirectionLabel({ allows_entry: false, allows_exit: true })).toBe('Out only');
    expect(gateDirectionLabel({})).toBe('In & Out');
  });
});
