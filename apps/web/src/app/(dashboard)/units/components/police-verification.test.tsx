import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { PoliceVerification } from './police-verification';
import type { OnboardingSummary } from '@/hooks';

/** MOVE-04 — police verification is set on the tenant's current lease. */

const state = vi.hoisted(() => ({ mutate: vi.fn(), toast: vi.fn() }));

vi.mock('@/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-tenant-lifecycle')>('@/hooks/use-tenant-lifecycle');
  return {
    POLICE_VERIFICATION_STATUSES: actual.POLICE_VERIFICATION_STATUSES,
    useUpdatePoliceVerification: () => ({ mutate: state.mutate, isPending: false }),
  };
});
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: state.toast }) }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));

const LEASE = {
  id: 'onb-1',
  status: 'approved',
  police_verification_status: 'not_started',
  police_verification_ref: null,
} as OnboardingSummary;

describe('PoliceVerification', () => {
  beforeEach(() => {
    state.mutate.mockReset();
    state.toast.mockReset();
  });

  it('offers the four states and saves the status with the reference', () => {
    render(<PoliceVerification lease={LEASE} />);
    const select = screen.getByLabelText('Police verification') as HTMLSelectElement;

    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      'Not started', 'Submitted', 'Verified', 'Rejected',
    ]);
    fireEvent.change(select, { target: { value: 'verified' } });
    fireEvent.change(screen.getByLabelText('Reference'), { target: { value: ' PV-2026-0042 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(state.mutate).toHaveBeenCalledWith(
      { onboarding_id: 'onb-1', police_verification_status: 'verified', police_verification_ref: 'PV-2026-0042' },
      expect.anything(),
    );
  });

  it('keeps Save off until something changes', () => {
    render(<PoliceVerification lease={LEASE} />);

    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('says "not available yet" when the server does not have the route', () => {
    state.mutate.mockImplementation((_input: unknown, opts: { onError: (e: unknown) => void }) =>
      opts.onError(new ApiError(404, { statusCode: 404, message: 'Not Found' } as never)),
    );
    render(<PoliceVerification lease={LEASE} />);

    fireEvent.change(screen.getByLabelText('Police verification'), { target: { value: 'submitted' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Police verification is not available yet' }));
  });
});
