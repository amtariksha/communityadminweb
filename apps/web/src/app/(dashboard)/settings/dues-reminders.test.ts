import { describe, expect, it } from 'vitest';
import { daysToSlots, normalizeReminderDays, ordinalDay, readDuesReminders } from './dues-reminders';

describe('dues reminder settings', () => {
  it('defaults to off with no days', () => {
    expect(readDuesReminders(undefined)).toEqual({ enabled: false, days: [] });
    expect(readDuesReminders({ enabled: 'yes', days: 'x' })).toEqual({ enabled: false, days: [] });
  });

  it('keeps distinct days 1–31 in order, at most four', () => {
    expect(normalizeReminderDays([0, 31, 5, 5, 32, 1.5, 20, 10, 2])).toEqual([2, 5, 10, 20]);
  });

  it('pads the form to four slots with Off', () => {
    expect(daysToSlots([5, 20])).toEqual([5, 20, 0, 0]);
  });

  it('names days as ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinalDay)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st',
    ]);
  });
});
