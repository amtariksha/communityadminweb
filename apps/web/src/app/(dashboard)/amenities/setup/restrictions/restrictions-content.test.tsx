import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestrictionsContent } from './restrictions-content';
import { ApiError } from '@/lib/api-error';

/** AMEN-41 — Setup › Restrictions saves its two choices; an older API says "not available yet". */

const state = vi.hoisted(() => ({
  query: {} as { isLoading: boolean; error: unknown; data?: unknown },
  saved: [] as unknown[],
}));

vi.mock('@/hooks/use-amenity-setup', () => ({
  useAmenitySettings: () => state.query,
  useSaveAmenitySettings: () => ({ mutateAsync: async (change: unknown) => state.saved.push(change), isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

describe('RestrictionsContent', () => {
  beforeEach(() => {
    state.saved = [];
    state.query = { isLoading: false, error: null, data: { block_defaulters: false, restrict_owner_when_tenanted: false, notifications: {} } };
  });

  it('starts from the stored choices and saves the changed ones', async () => {
    render(<RestrictionsContent />);
    expect((screen.getByLabelText('No, Allow All Residents') as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByLabelText('Yes, Block Defaulters'));
    fireEvent.click(screen.getByRole('checkbox', { name: /Restrict owner bookings/ }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));

    expect(state.saved).toEqual([{ block_defaulters: true, restrict_owner_when_tenanted: true }]);
  });

  it('says the page is not available yet on an older API', () => {
    state.query = { isLoading: false, error: new ApiError(404, { message: 'Not found' } as never) };
    render(<RestrictionsContent />);

    expect(screen.getByText('Restrictions are not available yet on this server.')).toBeTruthy();
  });
});
