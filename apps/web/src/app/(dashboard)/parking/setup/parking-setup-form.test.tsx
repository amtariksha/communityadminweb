import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParkingSetupForm } from './parking-setup-form';

/**
 * Parking Setup (PARK-10, screen PARK-S1): the resident add / edit switches
 * and the extra field's name, saved with one Save; read-only for roles that
 * cannot write it; "not available yet" before the API has the route.
 */

const mocks = vi.hoisted(() => ({
  query: { isLoading: false, isError: false, data: null as unknown, dataUpdatedAt: 1 },
  mutate: vi.fn(),
  role: 'community_admin' as string | null,
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('@/hooks/use-parking-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-parking-settings')>()),
  useParkingSettings: () => mocks.query,
  useSaveParkingSettings: () => ({ mutate: mocks.mutate, isPending: false }),
}));

const SAVED = { residents_can_add_vehicle: true, residents_can_edit_vehicle: true, vehicle_additional_field_label: '' };

beforeEach(() => {
  mocks.query = { isLoading: false, isError: false, data: SAVED, dataUpdatedAt: 1 };
  mocks.mutate.mockReset();
  mocks.role = 'community_admin';
});

const box = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

describe('ParkingSetupForm', () => {
  it('saves the switches and the label together', () => {
    render(<ParkingSetupForm />);
    expect(box('Allow residents to add vehicles').checked).toBe(true);

    fireEvent.click(box('Allow residents to add vehicles'));
    fireEvent.change(screen.getByLabelText('Additional Field label'), { target: { value: ' Fastag ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      { residents_can_add_vehicle: false, residents_can_edit_vehicle: true, vehicle_additional_field_label: 'Fastag' },
      expect.any(Object),
    );
  });

  it('refuses a label over 40 characters', () => {
    render(<ParkingSetupForm />);
    fireEvent.change(screen.getByLabelText('Additional Field label'), { target: { value: 'x'.repeat(41) } });

    expect(screen.getByText('At most 40 characters.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('is read-only for a role that cannot change it', () => {
    mocks.role = 'accountant';
    render(<ParkingSetupForm />);

    expect(box('Allow residents to edit their vehicles').disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('says "not available yet" before the API has Parking Setup', () => {
    mocks.query = { isLoading: false, isError: false, data: null, dataUpdatedAt: 0 };
    render(<ParkingSetupForm />);

    expect(screen.getByText('Parking Setup is not available yet.')).toBeTruthy();
  });
});
