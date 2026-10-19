import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverstayThresholdField, overstayMinutesError } from './overstay-threshold-field';

/** GATE-03 — Settings › Gates writes the threshold the overstay sweep reads. */

const TENANT = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  data: { overstay_threshold_minutes: 240 } as { overstay_threshold_minutes: number } | null,
  mutate: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-gate-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/use-gate-settings')>();
  return {
    ...actual,
    useGateSettings: () => ({ data: mocks.data, isLoading: false }),
    useUpdateGateSettings: () => ({ mutate: mocks.mutate, isPending: false }),
  };
});

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({
      id: 'user-1',
      name: 'Test Admin',
      phone: '+910000000010',
      isSuperAdmin: false,
      role,
      societies: [{ id: TENANT, name: 'Test Society', role }],
    }),
  );
}

const field = () => screen.getByLabelText('Overstay alert after (minutes)') as HTMLInputElement;
const save = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;

beforeEach(() => {
  mocks.data = { overstay_threshold_minutes: 240 };
  signIn('committee_member');
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('OverstayThresholdField', () => {
  it('shows the saved value', () => {
    render(<OverstayThresholdField />);
    expect(field().value).toBe('240');
    expect(save().disabled).toBe(true);
  });

  it('saves 60 minutes', () => {
    render(<OverstayThresholdField />);
    fireEvent.change(field(), { target: { value: '60' } });
    fireEvent.click(save());
    expect(mocks.mutate).toHaveBeenCalledWith({ overstay_threshold_minutes: 60 }, expect.any(Object));
  });

  it('refuses 10 minutes before sending it', () => {
    render(<OverstayThresholdField />);
    fireEvent.change(field(), { target: { value: '10' } });
    expect(save().disabled).toBe(true);
    expect(screen.getByText('Between 15 and 1440 minutes (24 hours).')).toBeTruthy();
  });

  it('is read-only for a role that cannot write it', () => {
    signIn('accountant');
    render(<OverstayThresholdField />);
    expect(field().disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('says "not available yet" when the API has no such route', () => {
    mocks.data = null;
    render(<OverstayThresholdField />);
    expect(screen.getByText('Overstay alert settings are not available yet.')).toBeTruthy();
  });
});

describe('overstayMinutesError', () => {
  it('accepts whole minutes from 15 to 1440', () => {
    for (const text of ['15', '60', '1440']) expect(overstayMinutesError(text)).toBeNull();
  });

  it('refuses blanks, fractions and values out of range', () => {
    for (const text of ['', '12.5', '14', '1441', 'abc']) expect(overstayMinutesError(text)).not.toBeNull();
  });
});
