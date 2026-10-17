import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HelpdeskCategory, HelpdeskSettings } from '@/hooks';
import { AutoResponsesForm } from './auto-responses-form';

/**
 * Setup > Automated Responses: a reply for requests raised outside office
 * days and hours, and a reply per category. Ticking a switch reveals its
 * inputs; a switch that is on needs what it replies with.
 */

const ALL_OFF = {
  new_request_owner: false,
  new_request_committee: false,
  escalated_owner: false,
  escalated_committee: false,
  status_changed_requester: false,
  resident_reply_owner: false,
  admin_reply_requester: false,
  completed_requester: false,
};

function settings(overrides: Partial<HelpdeskSettings> = {}): HelpdeskSettings {
  return {
    operational_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
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

const CATEGORIES: HelpdeskCategory[] = [
  { id: 'c1', name: 'Plumbing', display_order: 10, owner_l1_user_id: 'u1', auto_reply_text: 'A plumber will call.' },
  { id: 'c2', name: 'Electrical', display_order: 20, owner_l1_user_id: 'u1', auto_reply_text: null },
  { id: 'c3', name: 'Gas', display_order: 30, owner_l1_user_id: null, auto_reply_text: null },
];

function renderForm(
  value: HelpdeskSettings = settings(),
  props: Partial<React.ComponentProps<typeof AutoResponsesForm>> = {},
) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <AutoResponsesForm settings={value} categories={CATEGORIES} canEdit isSaving={false} onSave={onSave} {...props} />,
  );
  return { onSave };
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
const outsideSwitch = () => screen.getByRole('checkbox', { name: 'Auto-response for requests raised outside office hours' }) as HTMLInputElement;
const categorySwitch = () => screen.getByRole('checkbox', { name: 'Category-Specific Responses' }) as HTMLInputElement;
const message = () => screen.getByLabelText('Outside-hours message') as HTMLTextAreaElement;

describe('AutoResponsesForm — outside office hours', () => {
  it('hides the office days, hours and message until the switch is ticked', () => {
    renderForm();

    expect(screen.queryByLabelText('Outside-hours message')).toBeNull();
    fireEvent.click(outsideSwitch());
    expect(message()).toBeTruthy();
    expect(screen.getByLabelText('Office hours from')).toBeTruthy();
    expect(screen.getAllByRole('checkbox', { name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/ })).toHaveLength(7);
  });

  it('shows the saved office days and hours', () => {
    renderForm(settings({ auto_reply_outside_hours: true, auto_reply_outside_hours_text: 'We are closed.' }));

    expect((screen.getByLabelText('Mon') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Sun') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Office hours from') as HTMLInputElement).value).toBe('08:00');
    expect((screen.getByLabelText('Office hours to') as HTMLInputElement).value).toBe('20:00');
    expect(message().value).toBe('We are closed.');
  });

  it('asks for the message when the switch is on without one, and sends nothing', () => {
    const { onSave } = renderForm();

    fireEvent.click(outsideSwitch());
    save();

    expect(screen.getByText('Write the message residents get outside office hours.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('asks for at least one office day', () => {
    const { onSave } = renderForm(settings({ auto_reply_outside_hours: true, auto_reply_outside_hours_text: 'Closed.' }));

    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      fireEvent.click(screen.getByLabelText(day));
    }
    save();

    expect(screen.getByText('Choose at least one office day.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses office hours that end before they start', () => {
    const { onSave } = renderForm(settings({ auto_reply_outside_hours: true, auto_reply_outside_hours_text: 'Closed.' }));

    fireEvent.change(screen.getByLabelText('Office hours to'), { target: { value: '07:00' } });
    save();

    expect(screen.getByText('Office hours must end after they start.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the switch, days, hours and message', () => {
    const { onSave } = renderForm();

    fireEvent.click(outsideSwitch());
    fireEvent.change(message(), { target: { value: '  We are closed.  ' } });
    fireEvent.click(screen.getByLabelText('Sun'));
    fireEvent.change(screen.getByLabelText('Office hours from'), { target: { value: '09:00' } });
    save();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].settings).toEqual({
      auto_reply_outside_hours: true,
      auto_reply_outside_hours_text: 'We are closed.',
      operational_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      operational_hours_start: '09:00',
      operational_hours_end: '20:00',
      auto_reply_by_category: false,
    });
  });

  it('does not ask for a message while the switch is off', () => {
    const { onSave } = renderForm();

    save();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].settings.auto_reply_outside_hours).toBe(false);
  });
});

describe('AutoResponsesForm — by category', () => {
  it('lists the categories with their replies once the switch is ticked', () => {
    renderForm();

    expect(screen.queryByLabelText('Automatic reply for Plumbing')).toBeNull();
    fireEvent.click(categorySwitch());

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect((screen.getByLabelText('Automatic reply for Plumbing') as HTMLTextAreaElement).value).toBe('A plumber will call.');
    expect((screen.getByLabelText('Automatic reply for Electrical') as HTMLTextAreaElement).value).toBe('');
  });

  it('sends each category with its reply, and its owner, when the replies change', () => {
    const { onSave } = renderForm();

    fireEvent.click(categorySwitch());
    fireEvent.change(screen.getByLabelText('Automatic reply for Electrical'), { target: { value: ' An electrician will call. ' } });
    save();

    const { categoryRows, settings: sent } = onSave.mock.calls[0][0];
    expect(sent.auto_reply_by_category).toBe(true);
    expect(categoryRows).toEqual([
      { id: 'c1', name: 'Plumbing', owner_l1_user_id: 'u1', display_order: 10, auto_reply_text: 'A plumber will call.' },
      { id: 'c2', name: 'Electrical', owner_l1_user_id: 'u1', display_order: 20, auto_reply_text: 'An electrician will call.' },
    ]);
  });

  it('sends no category rows when no reply changed', () => {
    const { onSave } = renderForm();

    fireEvent.click(categorySwitch());
    save();

    expect(onSave.mock.calls[0][0].categoryRows).toBeNull();
  });

  it('removes a reply when its box is emptied', () => {
    const { onSave } = renderForm();

    fireEvent.click(categorySwitch());
    fireEvent.change(screen.getByLabelText('Automatic reply for Plumbing'), { target: { value: '' } });
    save();

    expect(onSave.mock.calls[0][0].categoryRows[0]).toMatchObject({ id: 'c1', auto_reply_text: '' });
  });

  it('cannot hold a reply for a category that has no owner yet', () => {
    renderForm();

    fireEvent.click(categorySwitch());

    expect((screen.getByLabelText('Automatic reply for Gas') as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.getByText('Choose an owner for this category in Setup first.')).toBeTruthy();
  });

  it('refuses a reply of more than 1000 characters', () => {
    const { onSave } = renderForm();

    fireEvent.click(categorySwitch());
    fireEvent.change(screen.getByLabelText('Automatic reply for Electrical'), { target: { value: 'x'.repeat(1001) } });
    save();

    expect(screen.getByText('A reply can be at most 1000 characters.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('AutoResponsesForm — read-only', () => {
  it('shows the settings but cannot change or save them', () => {
    renderForm(settings({ auto_reply_outside_hours: true, auto_reply_outside_hours_text: 'Closed.' }), { canEdit: false });

    expect(outsideSwitch().disabled).toBe(true);
    expect(message().disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();
  });
});
