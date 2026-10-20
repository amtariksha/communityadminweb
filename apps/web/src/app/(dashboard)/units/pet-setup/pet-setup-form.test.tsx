import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PetSetupForm } from './pet-setup-form';

/** Units & Users › Pet Setup (UNIT-35, UNIT-S16): the switch, the agreement, the count and Save. */
const mocks = vi.hoisted(() => ({
  settings: { data: undefined as unknown, isLoading: false, isError: false, dataUpdatedAt: 1 },
  stats: { data: { units_with_pets: 3, active_pets: 5 } as unknown },
  mutate: vi.fn(),
  role: 'committee_member' as string | null,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-documents', () => ({ useUploadFileToS3: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('@/hooks/use-pets', () => ({
  PET_AGREEMENT_MAX: 20_000,
  usePetSettings: () => mocks.settings,
  usePetStats: () => mocks.stats,
  useSavePetSettings: () => ({ mutate: mocks.mutate, isPending: false }),
}));

describe('PetSetupForm', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.role = 'committee_member';
    mocks.settings = { data: { enabled: false, agreement: null }, isLoading: false, isError: false, dataUpdatedAt: 1 };
    mocks.stats = { data: { units_with_pets: 3, active_pets: 5 } };
  });

  it('shows the count of units having pets and links to the pet register', () => {
    render(<PetSetupForm />);
    expect(screen.getByTestId('units-with-pets').textContent).toBe('3');
    expect(screen.getByRole('link', { name: 'View pet register' }).getAttribute('href')).toBe('/admin-reports/unit.pets_reports?from=%2Funits%2Fpet-setup');
  });

  it('shows 0 when no unit has a pet or the count is not available', () => {
    mocks.stats = { data: null };
    render(<PetSetupForm />);
    expect(screen.getByTestId('units-with-pets').textContent).toBe('0');
  });

  it('saves the switch and the agreement in the editor', () => {
    render(<PetSetupForm />);
    fireEvent.click(screen.getByRole('checkbox'));
    const box = screen.getByRole('textbox', { name: 'Pet User Agreement' });
    box.innerHTML = '<p><b>Dogs</b> on a leash</p>';
    fireEvent.input(box);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mocks.mutate).toHaveBeenCalledWith({ enabled: true, agreement: '<p><strong>Dogs</strong> on a leash</p>' }, expect.anything());
  });

  it('never puts a script or a handler from the saved agreement into the editor', () => {
    mocks.settings = { ...mocks.settings, data: { enabled: true, agreement: '<p onclick="x()">Rules<script>alert(1)</script></p>' } };
    render(<PetSetupForm />);
    expect(screen.getByRole('textbox', { name: 'Pet User Agreement' }).innerHTML).toBe('<p>Rules</p>');
  });

  it('saves an emptied agreement as none', () => {
    mocks.settings = { ...mocks.settings, data: { enabled: true, agreement: '<p>Old rules</p>' } };
    render(<PetSetupForm />);
    const box = screen.getByRole('textbox', { name: 'Pet User Agreement' });
    box.innerHTML = '<p><br></p>';
    fireEvent.input(box);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mocks.mutate).toHaveBeenCalledWith({ enabled: true, agreement: null }, expect.anything());
  });

  it('is read-only for roles that cannot save it', () => {
    mocks.role = 'accountant';
    render(<PetSetupForm />);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  });

  it('says "not available yet" when the API does not have Pet Setup', () => {
    mocks.settings = { data: null, isLoading: false, isError: false, dataUpdatedAt: 1 };
    render(<PetSetupForm />);
    expect(screen.getByText('Pet Setup is not available yet on this server.')).toBeTruthy();
  });
});
