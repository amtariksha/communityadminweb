import { describe, expect, it } from 'vitest';
import { ticketStatusLabel } from './ticket-status';

describe('ticketStatusLabel', () => {
  it.each([
    ['open', 'Open', 'New'],
    ['in_progress', 'In Progress', 'In Progress'],
    ['reopened', 'Reopened', 'Reopened'],
    ['resolved', 'Resolved', 'Job Completed'],
    ['closed', 'Closed', 'Closed'],
  ])('%s reads %s in standard and %s in classic', (status, standard, classic) => {
    expect(ticketStatusLabel(status, 'standard')).toBe(standard);
    expect(ticketStatusLabel(status, 'classic')).toBe(classic);
  });

  it('spells out a status it does not know', () => {
    expect(ticketStatusLabel('awaiting_resident', 'standard')).toBe('Awaiting Resident');
  });
});
