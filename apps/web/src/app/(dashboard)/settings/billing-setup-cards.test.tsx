import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingNotificationsCard } from './billing-notifications-card';
import { DefaultersPrivacyCard } from './defaulters-privacy-card';
import { ReminderTemplateCard } from './reminder-template-card';
import { ReminderLogList } from '../income/setup/defaulters/reminder-log-list';

const TENANT = '11111111-1111-4111-8111-111111111111';
const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  settings: {} as Record<string, unknown>,
  emailEnabled: true,
  logRows: [] as unknown[],
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-tenants', () => ({
  useTenant: () => ({ data: { id: TENANT, settings_json: mocks.settings } }),
  useTenantSettings: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock('@/hooks/use-billing-email', () => ({ useEmailTransport: () => ({ data: { enabled: mocks.emailEnabled, from: '' } }) }));
vi.mock('@/hooks/use-defaulters', () => ({
  useReminderLog: () => ({ data: { data: mocks.logRows, total: mocks.logRows.length }, isLoading: false, isError: false }),
}));

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem('communityos_user', JSON.stringify({ id: 'me', name: 'Me', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: TENANT, name: 'Green Acres', role }] }));
}

const saved = () => mocks.mutate.mock.calls[0][0].settings;

beforeEach(() => {
  mocks.settings = {};
  mocks.emailEnabled = true;
  mocks.logRows = [];
  signIn('community_admin');
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Setup › Notifications (INC-30)', () => {
  it('starts from invoice, receipt and credit note on, and saves the ticks, break-up and recipients whole', () => {
    render(<BillingNotificationsCard />);
    expect((screen.getByLabelText('E-mail on Invoice posted') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('E-mail on Receipt voided') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByLabelText('E-mail on Receipt voided'));
    fireEvent.click(screen.getByLabelText('E-mail on Invoice posted'));
    fireEvent.click(screen.getByLabelText('Attach the line break-up'));
    fireEvent.click(screen.getByLabelText('All Owners and Tenants'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(saved()).toEqual({
      billing_notifications: { email_events: ['receipt_posted', 'credit_note_posted', 'receipt_voided'], attach_breakup: false, recipients: 'owners_and_tenants' },
    });
  });

  it('says when the server cannot send e-mail', () => {
    mocks.emailEnabled = false;
    render(<BillingNotificationsCard />);
    expect(screen.getByRole('status').textContent).toBe('E-mail sending is not configured; ticks are saved but nothing is sent.');
  });
});

describe('Setup › Defaulters (INC-30)', () => {
  it('saves the phone and e-mail switches', () => {
    render(<DefaultersPrivacyCard />);
    fireEvent.click(screen.getByLabelText('Do not show e-mail addresses on the Defaulters page'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saved()).toEqual({ billing_defaulters: { hide_phone: false, hide_email: true } });
  });

  it('saves the reminder text with the reminder days already set', () => {
    mocks.settings = { billing_reminders: { enabled: true, days: [5, 20] } };
    render(<ReminderTemplateCard />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Dues for {{unit}}' } });
    fireEvent.change(screen.getByLabelText('Reply To'), { target: { value: 'treasurer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saved().billing_reminders).toMatchObject({
      enabled: true,
      days: [5, 20],
      template: { subject: 'Dues for {{unit}}', reply_to: 'treasurer@example.com', from_name: null },
    });
  });

  it('lists the reminders sent, and says so when there are none', () => {
    const { unmount } = render(<ReminderLogList />);
    expect(screen.getByText('No reminders sent yet.')).toBeTruthy();
    unmount();
    mocks.logRows = [{ id: '1', sent_on: '2026-10-05T03:30:00Z', unit_label: 'A-101', recipient: 'owner@example.com', channel: 'email', trigger: 'manual', status: 'failed', notes: 'transport_disabled' }];
    render(<ReminderLogList />);
    const row = screen.getAllByRole('row')[1];
    expect(row.textContent).toContain('A-101');
    expect(row.textContent).toContain('Manual');
    expect(row.textContent).toContain('E-mail is not configured on the server');
  });

  it('shows an accountant the switches without a save button', () => {
    signIn('accountant');
    render(<DefaultersPrivacyCard />);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});
