import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShiftTemplatesCard } from './shift-templates-card';

/** STAFF-01 — shifts can be edited and deleted (the hooks existed with no screen). */

const mocks = vi.hoisted(() => ({ update: vi.fn(), remove: vi.fn(), create: vi.fn() }));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-staff', () => ({
  useStaffShifts: () => ({
    isLoading: false,
    data: [{ id: 'shift-1', tenant_id: 't1', name: 'Night', start_time: '22:00:00', end_time: '06:00:00', created_at: '' }],
  }),
  useCreateShift: () => ({ mutate: mocks.create, isPending: false }),
  useUpdateShift: () => ({ mutate: mocks.update, isPending: false }),
  useDeleteShift: () => ({ mutate: mocks.remove, isPending: false }),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('ShiftTemplatesCard', () => {
  it('lists the shift with HH:MM times', () => {
    render(<ShiftTemplatesCard />);
    expect(screen.getByText('22:00 - 06:00')).toBeTruthy();
  });

  it('edits a shift through PATCH with HH:MM times', () => {
    render(<ShiftTemplatesCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Night' }));

    expect((screen.getByLabelText('Start Time') as HTMLInputElement).value).toBe('22:00');
    fireEvent.change(screen.getByLabelText('Shift Name'), { target: { value: 'Late Night' } });
    fireEvent.submit(screen.getByLabelText('Shift Name').closest('form') as HTMLFormElement);

    expect(mocks.update).toHaveBeenCalledWith(
      { id: 'shift-1', data: { name: 'Late Night', start_time: '22:00', end_time: '06:00' } },
      expect.any(Object),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('deletes a shift after confirming, and not when cancelled', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<ShiftTemplatesCard />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Night' }));
    expect(mocks.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Night' }));
    expect(mocks.remove).toHaveBeenCalledWith('shift-1', expect.any(Object));
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});
