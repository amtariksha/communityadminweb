import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AMENITY_NOTIFICATION_DEFAULTS } from '@communityos/shared';
import { NotificationsCard } from './notifications-card';

/** AMEN-45 — Setup Notifications: the stored switches, saved together; new notices start off. */

const state = vi.hoisted(() => ({ saved: [] as unknown[], query: null as unknown }));

// One object for every render, as the query cache hands back.
vi.mock('@/hooks/use-amenity-setup', () => ({
  useAmenitySettings: () => state.query,
  useSaveAmenitySettings: () => ({ mutateAsync: async (change: unknown) => state.saved.push(change), isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

describe('NotificationsCard', () => {
  beforeEach(() => {
    state.saved = [];
    state.query = {
      isLoading: false,
      error: null,
      data: { block_defaulters: false, restrict_owner_when_tenanted: false, notifications: { ...AMENITY_NOTIFICATION_DEFAULTS } },
    };
  });

  it('shows the confirmation on and every new notice off', () => {
    render(<NotificationsCard />);

    expect((screen.getByRole('checkbox', { name: /Booking confirmed/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /Awaiting payment/ }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('checkbox', { name: /by e-mail/ }) as HTMLInputElement).checked).toBe(false);
  });

  it('saves the switches together', async () => {
    render(<NotificationsCard />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Payment reminder/ }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })));

    expect(state.saved).toEqual([{ notifications: { ...AMENITY_NOTIFICATION_DEFAULTS, payment_reminder: true } }]);
  });
});
