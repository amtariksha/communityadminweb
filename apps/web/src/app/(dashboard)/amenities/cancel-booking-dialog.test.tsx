import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelBookingDialog, cancelOutcomeToast } from './cancel-booking-dialog';
import type { AmenityBooking } from '@/hooks';

/** AMEN-02 — an admin cancels with a reason; the reason and refund choice reach the API. */

const state = vi.hoisted(() => ({ mutate: vi.fn(), toast: vi.fn() }));

vi.mock('@/hooks', () => ({
  useCancelBooking: () => ({ mutate: state.mutate, isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: state.toast }) }));

const BOOKING = {
  id: 'b-1',
  amenity_name: 'Party Hall',
  invoice_id: 'inv-1',
  invoice_number: 'INV-0042',
} as AmenityBooking;

describe('CancelBookingDialog', () => {
  beforeEach(() => {
    state.mutate.mockReset();
    state.toast.mockReset();
  });

  it('keeps Cancel Booking disabled until a reason of 3+ characters is typed', () => {
    render(<CancelBookingDialog booking={BOOKING} onClose={vi.fn()} />);
    const submit = screen.getByRole('button', { name: 'Cancel Booking' }) as HTMLButtonElement;

    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'no' } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Hall under repair' } });
    expect(submit.disabled).toBe(false);
  });

  it('sends the reason and the refund choice', () => {
    render(<CancelBookingDialog booking={BOOKING} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '  Hall under repair ' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Booking' }));

    expect(state.mutate).toHaveBeenCalledWith(
      { id: 'b-1', reason: 'Hall under repair', refund: false },
      expect.anything(),
    );
  });

  it('says the invoice was cancelled with a credit note', () => {
    expect(
      cancelOutcomeToast({
        booking: BOOKING,
        refunded_payment_order_ids: [],
        refund_failed: false,
        refund_skipped_reason: 'not_paid',
        invoice_cancelled: true,
      }).description,
    ).toMatch(/credit note/);
  });
});
