import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HelpdeskSettings } from '@/hooks';
import { NotificationAlertsForm } from './notification-alerts-form';
import { ALERT_ROWS, parseCommitteeEmails } from './alert-rows';

/**
 * Setup > Notification Alerts: ten email switches, whether owners'
 * emails carry the requester's unit and phone, and the committee list.
 * Pushes are always sent, so only email is switched here.
 */

// What an API before HELP-18 sends: the first eight alerts.
const FIRST_EIGHT = {
  new_request_owner: false,
  new_request_committee: false,
  escalated_owner: false,
  escalated_committee: false,
  status_changed_requester: false,
  resident_reply_owner: false,
  admin_reply_requester: false,
  completed_requester: false,
};

const ALL_OFF = { ...FIRST_EIGHT, serviced_by_assigned: false, feedback_owner: false };

function settings(overrides: Partial<HelpdeskSettings> = {}): HelpdeskSettings {
  return {
    operational_days: [],
    operational_hours_start: '08:00:00',
    operational_hours_end: '20:00:00',
    allowed_modes: [],
    aging_sla_hours: 48,
    committee_emails: [],
    notification_alerts: { ...ALL_OFF },
    include_contact_in_alerts: false,
    auto_reply_outside_hours: false,
    auto_reply_outside_hours_text: null,
    auto_reply_by_category: false,
    ...overrides,
  };
}

function renderForm(
  value: HelpdeskSettings = settings(),
  props: Partial<React.ComponentProps<typeof NotificationAlertsForm>> = {},
) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<NotificationAlertsForm settings={value} canEdit isSaving={false} onSave={onSave} {...props} />);
  return { onSave };
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
const committeeBox = () => screen.getByLabelText('Committee email list') as HTMLTextAreaElement;
const box = (label: RegExp) => screen.getByRole('checkbox', { name: label }) as HTMLInputElement;

describe('NotificationAlertsForm', () => {
  it('lists the ten alerts in order, each with an email switch', () => {
    renderForm();

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(10);
    expect(within(rows[8]).getAllByRole('cell')[1].textContent).toBe('Serviced By assigned → That staff member');
    expect(within(rows[9]).getAllByRole('cell')[1].textContent).toBe('Feedback received → Driven By');
    expect(within(rows[0]).getAllByRole('cell')[0].textContent).toBe('1');
    expect(within(rows[0]).getAllByRole('cell')[1].textContent).toBe('New request → Category owner (Level 1)');
    expect(within(rows[7]).getAllByRole('cell')[1].textContent).toBe('Job completed or closed → Person who raised it');
  });

  it('offers an older API only the alerts it knows, and sends only those', () => {
    const { onSave } = renderForm(settings({ notification_alerts: { ...FIRST_EIGHT } }));

    expect(within(screen.getByRole('table')).getAllByRole('row').slice(1)).toHaveLength(8);
    save();
    expect(Object.keys(onSave.mock.calls[0][0].notification_alerts)).toEqual(Object.keys(FIRST_EIGHT));
  });

  it('shows the switches the society has saved', () => {
    renderForm(settings({ notification_alerts: { ...ALL_OFF, status_changed_requester: true }, include_contact_in_alerts: true, committee_emails: ['one@example.test'] }));

    expect(box(/Status changed/).checked).toBe(true);
    expect(box(/New request → Category owner/).checked).toBe(false);
    expect(box(/Include the requester's unit and contact number/).checked).toBe(true);
    expect(committeeBox().value).toBe('one@example.test');
  });

  it('saves every switch, the contact option and the committee list in one go', () => {
    const { onSave } = renderForm();

    fireEvent.click(box(/New request → Committee email list/));
    fireEvent.click(box(/Include the requester's unit and contact number/));
    fireEvent.change(committeeBox(), { target: { value: 'one@example.test\n\n  two@example.test  \n' } });
    save();

    expect(onSave).toHaveBeenCalledWith({
      notification_alerts: { ...ALL_OFF, new_request_committee: true },
      include_contact_in_alerts: true,
      committee_emails: ['one@example.test', 'two@example.test'],
    });
  });

  it('names the line of an address that is not an email and sends nothing', () => {
    const { onSave } = renderForm();

    fireEvent.change(committeeBox(), { target: { value: 'one@example.test\nnot-an-email' } });
    save();

    expect(screen.getByText('Line 2 is not a valid email address.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses more than 20 addresses', () => {
    const { onSave } = renderForm();

    fireEvent.change(committeeBox(), {
      target: { value: Array.from({ length: 21 }, (_, i) => `member${i}@example.test`).join('\n') },
    });
    save();

    expect(screen.getByText('Add at most 20 email addresses.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('is read-only for a role that may not save', () => {
    renderForm(settings(), { canEdit: false });

    expect(box(/New request → Category owner/).disabled).toBe(true);
    expect(committeeBox().disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();
  });
});

describe('alert rows and the committee list', () => {
  it('matches the keys the API accepts, in screen order', () => {
    expect(ALERT_ROWS.map((row) => row.key)).toEqual(Object.keys(ALL_OFF));
  });

  it('reads one address per line and ignores blank lines', () => {
    expect(parseCommitteeEmails('a@example.test\n\n b@example.test \r\n')).toEqual({
      emails: ['a@example.test', 'b@example.test'],
    });
  });

  it('reports the first line that is not an email', () => {
    expect(parseCommitteeEmails('a@example.test\nbad\nworse')).toEqual({
      error: 'Line 2 is not a valid email address.',
    });
  });

  it('counts the line number including blank lines', () => {
    expect(parseCommitteeEmails('a@example.test\n\nbad')).toEqual({
      error: 'Line 3 is not a valid email address.',
    });
  });
});
