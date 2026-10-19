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

  // GATE-05, AMEN-04, ASSET-04, STAFF-03 — resolved by UNIT-08 + UNIT-D21:
  // the switches those tickets named are not offered (the grid cells are the
  // switches now).
  it.each([
    ['GATE-05', 'Parcel logs + mark collected'],
    ['GATE-05', 'ANPR vehicle logs'],
    ['GATE-05', 'Review unrecognized vehicles'],
    ['GATE-05', 'Cancel / override visitor passes'],
    ['AMEN-04', 'Amenity bookings (cancel, manage slots)'],
    ['ASSET-04', 'Assets + AMC (view, log service)'],
    ['STAFF-03', 'Create/edit non-guard staff'],
    ['STAFF-03', 'Manage shifts (guards)'],
    ['STAFF-03', 'Manage shifts (all staff)'],
    ['STAFF-03', 'View attendance reports'],
    ['STAFF-03', 'Approve leave — all staff'],
  ])('%s: does not offer "%s"', (_ticket, label) => {
    render(<RoleDelegationCard />);

    expect(screen.queryByText(label)).toBeNull();
  });

  it('still offers the role expiry control', () => {
    render(<RoleDelegationCard />);

    expect(screen.getByText('Role expiry enforcement')).toBeTruthy();
  });

  it('describes each expiry choice by what it does, promising no audit entry (SB-15)', () => {
    render(<RoleDelegationCard />);

    const options = Array.from(document.querySelectorAll('option')).map((option) => option.textContent ?? '');
    expect(options).toEqual([
      'Hybrid (recommended) — Expired roles lose access.',
      'Filter only — Expired roles lose access (same as Hybrid).',
      'Log only — Expired roles keep working (same as Disabled).',
      'Disabled — Expired roles keep working; the end date is only recorded.',
    ]);
    expect(options.join(' ')).not.toMatch(/audit/i);
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
