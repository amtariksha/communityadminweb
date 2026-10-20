import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AttendeesContent } from './attendees-content';

/**
 * AMEN-43 — Event › Members Attending (AMEN-S9): pick an event, Get Members;
 * amount, paid, remaining and the receipt per member; Cancel ticket on live
 * purchases only.
 */

const asked = vi.hoisted(() => ({ eventIds: [] as string[] }));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));
vi.mock('@/hooks', () => ({
  useEvents: () => ({ data: [{ id: 'ev-1', title: 'Diwali Dinner', event_date: '2031-11-01' }] }),
}));
vi.mock('@/hooks/use-event-tickets', () => ({
  useEventAttendees: (eventId: string) => {
    asked.eventIds.push(eventId);
    return {
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'p-1', member_id: 'm-1', name: 'Asha Rao', block: 'T', unit_number: '1', slot_label: 'Evening',
          member_tickets: 2, guest_tickets: 1, amount: '700.00', paid: '400.00', remaining: '300.00',
          invoice_id: 'inv-1', invoice_number: 'INV-9', invoice_status: 'partially_paid', receipt_numbers: 'RCT-T1',
          contact_no: '+910000000041', email: 'asha@example.com', status: 'going', tickets_cancelled_at: null,
        },
        {
          id: 'p-2', member_id: 'm-2', name: 'Ravi Iyer', block: 'T', unit_number: '2', slot_label: 'Evening',
          member_tickets: 3, guest_tickets: 0, amount: '600.00', paid: '0.00', remaining: '0.00',
          invoice_id: 'inv-2', invoice_number: 'INV-10', invoice_status: 'cancelled', receipt_numbers: null,
          contact_no: '+910000000042', email: null, status: 'not_going', tickets_cancelled_at: '2031-10-20 10:00:00+05:30',
        },
      ],
      refetch: vi.fn(),
    };
  },
  useCancelEventTickets: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

describe('AttendeesContent', () => {
  it('asks for nothing until an event is picked and Get Members is pressed', () => {
    render(<AttendeesContent />);

    expect(screen.getByText('Pick an event and press Get Members.')).toBeTruthy();
    expect(asked.eventIds).toEqual([]);
  });

  it('lists amount, paid, remaining and the receipt, with Cancel ticket on live purchases only', () => {
    render(<AttendeesContent />);
    fireEvent.change(screen.getByLabelText('Event'), { target: { value: 'ev-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Get Members' }));

    const rows = within(screen.getByRole('table', { name: 'Members Attending' })).getAllByRole('row');
    expect(rows[1].textContent).toContain('Asha Rao');
    expect(rows[1].textContent).toContain('700');
    expect(rows[1].textContent).toContain('400');
    expect(rows[1].textContent).toContain('300');
    expect(rows[1].textContent).toContain('RCT-T1');
    expect(within(rows[1]).getByRole('button', { name: 'Cancel ticket' })).toBeTruthy();
    expect(within(rows[2]).queryByRole('button', { name: 'Cancel ticket' })).toBeNull();
  });
});
