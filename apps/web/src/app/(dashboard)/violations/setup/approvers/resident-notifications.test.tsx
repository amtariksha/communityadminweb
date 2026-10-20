import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResidentNotifications } from './resident-notifications';

/** RULE-07 — the switch that tells residents of their violations: shown off by default, a click saves it. */

const state = vi.hoisted(() => ({ on: false, save: vi.fn() }));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-violations', () => ({
  useViolationNotifications: () => ({ data: { notify_residents: state.on }, isLoading: false, error: null }),
  useSaveViolationNotifications: () => ({ mutate: state.save, isPending: false }),
}));

beforeEach(() => {
  state.on = false;
  state.save.mockReset();
});

describe('Resident notifications', () => {
  it('is off until switched on, and saves the tick', () => {
    render(<ResidentNotifications canEdit />);
    const box = screen.getByRole('checkbox');
    expect((box as HTMLInputElement).checked).toBe(false);

    fireEvent.click(box);

    expect(state.save.mock.calls[0][0]).toEqual({ notify_residents: true });
  });

  it('is read-only for anyone but the community admin', () => {
    state.on = true;
    render(<ResidentNotifications canEdit={false} />);

    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  });
});
