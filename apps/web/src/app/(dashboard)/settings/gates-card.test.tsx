import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GatesCard } from './gates-card';

/**
 * GATE-02 — Deactivate retires the gate; a retired gate is listed greyed with Reactivate.
 * GATE-20 — the gate form ticks In and Out; a gate with neither is not sent.
 */

const mocks = vi.hoisted(() => ({
  gatesOptions: [] as unknown[],
  deleteGate: vi.fn(),
  updateGate: vi.fn(),
  createGate: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-staff', () => ({
  useGates: (options: unknown) => {
    mocks.gatesOptions.push(options);
    return {
      isLoading: false,
      data: [
        { id: 'g-main', name: 'Main Gate', location: 'North', gate_type: 'vehicle_and_pedestrian', is_active: true, staff_count: 2 },
        { id: 'g-old', name: 'Old Gate', location: null, gate_type: 'pedestrian_only', is_active: false, staff_count: 0, allows_entry: true, allows_exit: false },
      ],
    };
  },
  useCreateGate: () => ({ mutate: mocks.createGate, isPending: false }),
  useUpdateGate: () => ({ mutate: mocks.updateGate, isPending: false }),
  useDeleteGate: () => ({ mutate: mocks.deleteGate, isPending: false }),
}));

afterEach(() => {
  vi.clearAllMocks();
  mocks.gatesOptions = [];
});

describe('GatesCard', () => {
  it('asks for retired gates too', () => {
    render(<GatesCard />);
    expect(mocks.gatesOptions[0]).toEqual({ includeInactive: true });
  });

  it('deactivates through DELETE /gate/gates/:id, not a PATCH the API strips', () => {
    render(<GatesCard />);

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Main Gate' }));
    fireEvent.click(screen.getByText('Deactivate'));

    expect(mocks.deleteGate).toHaveBeenCalledWith('g-main', expect.any(Object));
    expect(mocks.updateGate).not.toHaveBeenCalled();
  });

  it('lists a retired gate as Inactive with Reactivate', () => {
    render(<GatesCard />);

    const row = screen.getByTestId('gate-row-g-old');
    expect(row.className).toContain('opacity-60');
    expect(within(row).getByText('Inactive')).toBeTruthy();
    expect(within(row).getByText('Pedestrian Only')).toBeTruthy();

    fireEvent.click(within(row).getByRole('button', { name: 'Reactivate' }));
    expect(mocks.updateGate).toHaveBeenCalledWith({ id: 'g-old', data: { is_active: true } }, expect.any(Object));
  });

  it('shows each gate In, Out or both', () => {
    render(<GatesCard />);

    expect(within(screen.getByTestId('gate-row-g-main')).getByText('In & Out')).toBeTruthy();
    expect(within(screen.getByTestId('gate-row-g-old')).getByText('In only')).toBeTruthy();
  });

  it('edits a gate to In only', () => {
    render(<GatesCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Main Gate' }));
    fireEvent.click(screen.getByText('Edit'));

    const out = screen.getByLabelText('Out') as HTMLInputElement;
    expect(out.checked).toBe(true);
    fireEvent.click(out);
    fireEvent.click(screen.getByRole('button', { name: 'Save Gate' }));

    expect(mocks.updateGate).toHaveBeenCalledWith(
      { id: 'g-main', data: expect.objectContaining({ allows_entry: true, allows_exit: false }) },
      expect.any(Object),
    );
  });

  it('does not send a gate with neither In nor Out', () => {
    render(<GatesCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Main Gate' }));
    fireEvent.click(screen.getByText('Edit'));

    fireEvent.click(screen.getByLabelText('In'));
    fireEvent.click(screen.getByLabelText('Out'));

    expect(screen.getByRole('alert').textContent).toBe('Tick In, Out or both.');
    const save = screen.getByRole('button', { name: 'Save Gate' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(save);
    expect(mocks.updateGate).not.toHaveBeenCalled();
  });
});
