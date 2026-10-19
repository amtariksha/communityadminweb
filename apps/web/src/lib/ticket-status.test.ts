import { describe, expect, it } from 'vitest';
import { statusChoices, ticketStatusLabel } from './ticket-status';

describe('ticketStatusLabel', () => {
  it.each([
    ['open', 'Open', 'New'],
    ['in_progress', 'In Progress', 'In Progress'],
    ['on_hold', 'On Hold', 'On Hold'],
    ['awaiting_resident', 'Awaiting Resident', 'Awaiting Resident Response'],
    ['reopened', 'Reopened', 'Reopened'],
    ['resolved', 'Resolved', 'Job Completed'],
    ['closed', 'Closed', 'Closed'],
  ])('%s reads %s in standard and %s in classic', (status, standard, classic) => {
    expect(ticketStatusLabel(status, 'standard')).toBe(standard);
    expect(ticketStatusLabel(status, 'classic')).toBe(classic);
  });

  it('spells out a status it does not know', () => {
    expect(ticketStatusLabel('waiting_on_vendor', 'standard')).toBe('Waiting On Vendor');
  });
});

describe('statusChoices (HELP-14)', () => {
  it('offers a closed request only Reopened', () => {
    expect(statusChoices('closed')).toEqual(['closed', 'reopened']);
  });

  it('offers the captured order, with both waiting states, and no Reopened while not current', () => {
    expect(statusChoices('in_progress')).toEqual([
      'open',
      'in_progress',
      'on_hold',
      'closed',
      'awaiting_resident',
      'resolved',
    ]);
  });

  it('keeps Reopened in the list while it is the current status', () => {
    expect(statusChoices('reopened')).toContain('reopened');
  });
});
