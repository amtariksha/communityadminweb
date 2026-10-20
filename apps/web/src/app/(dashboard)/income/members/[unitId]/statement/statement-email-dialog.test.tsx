import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UnitStatement } from '@/hooks/use-unit-statement';
import { ApiError } from '@/lib/api-error';
import { statementEmailSubject } from './statement-actions';
import { StatementEmailDialog } from './statement-email-dialog';

/** INC-22 — Send Email on a statement: members, subject, message; off until Setup › Notifications; results. */

const mocks = vi.hoisted(() => ({
  send: { mutate: vi.fn(), isPending: false, error: null as unknown, data: undefined as unknown },
}));

vi.mock('@/hooks/use-billing-email', () => ({ useSendStatementEmail: () => mocks.send }));
vi.mock('@/hooks/use-units', () => ({
  useUnitMembers: () => ({
    data: [
      { id: 'm-1', member_type: 'owner', name: 'Asha Rao', email: 'asha@example.com', is_active: true, move_out_date: null },
      { id: 'm-2', member_type: 'tenant', name: 'Ravi Kumar', email: null, is_active: true, move_out_date: null },
      { id: 'm-3', member_type: 'owner', name: 'Old Owner', email: 'old@example.com', is_active: false, move_out_date: '2025-01-01' },
    ],
  }),
}));

const STATEMENT = {
  unit: { id: 'u-1', unit_number: '101', block: 'A' },
  from: '2026-04-01',
  to: '2026-10-20',
} as UnitStatement;

describe('StatementEmailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send = { mutate: vi.fn(), isPending: false, error: null, data: undefined };
  });

  it("starts with the statement's subject and sends to the members ticked", () => {
    render(<StatementEmailDialog party={{ kind: 'unit', id: 'u-1' }} statement={STATEMENT} scope="member" onClose={vi.fn()} />);

    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('Account Statement for A-101 – 01-04-2026 to 20-10-2026');
    expect(screen.queryByText(/Old Owner/)).toBeNull();
    fireEvent.click(screen.getByLabelText(/Asha Rao/));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Please clear the dues by month end.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(mocks.send.mutate).toHaveBeenCalledWith({
      path: '/unit-ledger/units/u-1/statement',
      body: {
        subject: 'Account Statement for A-101 – 01-04-2026 to 20-10-2026',
        message: 'Please clear the dues by month end.',
        from: '2026-04-01',
        to: '2026-10-20',
        scope: 'member',
        member_ids: ['m-1'],
      },
    });
  });

  it("leaves the recipients to the server when none is ticked, and a payer's goes to its e-mail", () => {
    render(<StatementEmailDialog party={{ kind: 'payer', id: 'c-1' }} statement={{ ...STATEMENT, payer: { id: 'c-1', name: 'Sunrise Events' } }} scope="all" onClose={vi.fn()} />);

    expect(screen.queryByText('Send to')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    const call = mocks.send.mutate.mock.calls[0][0];
    expect(call.path).toBe('/unit-ledger/customers/c-1/statement');
    expect(call.body).not.toHaveProperty('member_ids');
    expect(call.body.subject).toBe(statementEmailSubject({ ...STATEMENT, payer: { id: 'c-1', name: 'Sunrise Events' } }));
  });

  it('points to Setup › Notifications while e-mailing statements is off', () => {
    mocks.send.error = new ApiError(409, {
      message: 'E-mailing statements is off. Tick "Account statements" under Setup › Notifications to turn it on.',
      code: 'statement_email_off',
    } as never);
    render(<StatementEmailDialog party={{ kind: 'unit', id: 'u-1' }} statement={STATEMENT} scope="member" onClose={vi.fn()} />);

    expect(screen.getByRole('alert').textContent).toContain('E-mailing statements is off.');
    expect(screen.getByRole('link', { name: 'Open Setup › Notifications' }).getAttribute('href')).toBe('/income/setup/notifications');
  });

  it('says Send Email is not available yet when the route is missing', () => {
    mocks.send.error = new ApiError(404, { message: 'Cannot POST' } as never);
    render(<StatementEmailDialog party={{ kind: 'unit', id: 'u-1' }} statement={STATEMENT} scope="member" onClose={vi.fn()} />);

    expect(screen.getByRole('alert').textContent).toBe('Send Email is not available yet on this server.');
  });

  it('shows what happened to each recipient', () => {
    mocks.send.data = {
      data: [
        { id: 'l-1', recipient_name: 'Asha Rao', recipient_email: 'asha@example.com', subject: 's', status: 'sent', error: null },
        { id: 'l-2', recipient_name: 'Ravi Kumar', recipient_email: null, subject: 's', status: 'skipped_no_email', error: null },
      ],
    };
    render(<StatementEmailDialog party={{ kind: 'unit', id: 'u-1' }} statement={STATEMENT} scope="member" onClose={vi.fn()} />);

    expect(screen.getByText('Sent')).toBeTruthy();
    expect(screen.getByText('No e-mail address')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
  });
});
