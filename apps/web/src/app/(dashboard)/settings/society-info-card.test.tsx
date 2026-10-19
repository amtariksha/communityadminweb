import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SocietyInfoCard, societyInfoAccess } from './society-info-card';

/**
 * Settings › Society Information (PROF-20): a community admin edits the
 * address through the profile route, the name stays read-only; the super
 * admin keeps the tenant route.
 */
const mocks = vi.hoisted(() => ({
  role: 'community_admin',
  updateTenant: vi.fn(),
  updateProfile: vi.fn(),
  // Stable, as react-query's data is between renders.
  tenant: { isLoading: false, data: { name: 'Green Meadows', address: '12 Lake Road', city: 'Bengaluru', state: 'Karnataka' } },
}));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('@/lib/auth', () => ({ getCurrentTenant: () => 't-1' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks', () => ({
  useTenant: () => mocks.tenant,
  useUpdateTenant: () => ({ mutate: mocks.updateTenant, isPending: false }),
}));
vi.mock('@/hooks/use-society-profile', () => ({ useUpdateSocietyProfile: () => ({ mutate: mocks.updateProfile, isPending: false }) }));

describe('SocietyInfoCard', () => {
  beforeEach(() => {
    mocks.updateTenant.mockReset();
    mocks.updateProfile.mockReset();
  });

  it('lets a community admin save the address, not the name', () => {
    mocks.role = 'community_admin';
    render(<SocietyInfoCard />);
    expect((screen.getByLabelText('Society Name') as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Mysuru' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Society Info/ }));
    expect(mocks.updateProfile).toHaveBeenCalledWith({ address: '12 Lake Road', city: 'Mysuru', state: 'Karnataka' }, expect.anything());
    expect(mocks.updateTenant).not.toHaveBeenCalled();
  });

  it('keeps the super admin on the tenant route, name included', () => {
    mocks.role = 'super_admin';
    render(<SocietyInfoCard />);
    fireEvent.click(screen.getByRole('button', { name: /Save Society Info/ }));
    expect(mocks.updateTenant).toHaveBeenCalledWith(
      { id: 't-1', data: { name: 'Green Meadows', address: '12 Lake Road', city: 'Bengaluru', state: 'Karnataka' } },
      expect.anything(),
    );
  });

  it('is read-only for other roles', () => {
    expect(societyInfoAccess('committee_member')).toEqual({ name: false, address: false });
    mocks.role = 'accountant';
    render(<SocietyInfoCard />);
    expect(screen.queryByRole('button', { name: /Save Society Info/ })).toBeNull();
  });
});
