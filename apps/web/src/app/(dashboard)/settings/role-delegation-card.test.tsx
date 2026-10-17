import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleDelegationCard } from './role-delegation-card';

/**
 * UNIT-08 — the card offered thirty supervisor switches; only two are read by
 * anything (whether a supervisor sees their team's requests). It now shows
 * those two and the expiry control, nothing that saves and changes nothing.
 */

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useRoleDelegation: () => ({
    data: {
      security_supervisor: { security_tickets_crud: true },
      facility_supervisor: { maintenance_tickets_crud: true },
      expiry_enforcement: 'hybrid',
    },
    isLoading: false,
  }),
  useUpdateRoleDelegation: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

describe('RoleDelegationCard', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
  });

  it('shows no per-supervisor switch except the two that decide who sees which requests', () => {
    render(<RoleDelegationCard />);

    const labels = screen.getAllByRole('checkbox').map((box) => {
      const id = box.getAttribute('id') ?? '';
      return document.querySelector(`label[for="${id}"]`)?.textContent;
    });

    expect(labels).toEqual([
      'Sees the security team’s requests',
      'Sees the facility team’s requests',
    ]);
    expect(screen.queryByText('Create/edit guard staff')).toBeNull();
    expect(screen.queryByText('Member directory with contact details')).toBeNull();
  });

  it('still offers the role expiry control', () => {
    render(<RoleDelegationCard />);

    expect(screen.getByText('Role expiry enforcement')).toBeTruthy();
  });

  it('saves only the switch that was flipped', () => {
    render(<RoleDelegationCard />);

    fireEvent.click(screen.getByLabelText('Sees the security team’s requests'));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate.mock.calls[0][0]).toEqual({
      security_supervisor: { security_tickets_crud: false },
    });
  });
});
