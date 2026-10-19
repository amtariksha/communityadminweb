'use client';

import { type ReactNode } from 'react';
import { useTenant } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';
import { canChangeSettings } from '../../../settings/settings-access';
import { ordinalDay, readDuesReminders } from '../../../settings/dues-reminders';

/** What the reminder job will do, for those who may read but not change it. */
export function remindersSentence(saved: unknown): string {
  const reminders = readDuesReminders(saved);
  if (!reminders.enabled || reminders.days.length === 0) return 'Automatic reminders are off.';
  return `Automatic reminders go out at 09:00 IST on the ${reminders.days.map(ordinalDay).join(', ')} of each month.`;
}

export function RemindersSummary(): ReactNode {
  const tenantId = getCurrentTenant() ?? '';
  const tenantQuery = useTenant(tenantId);
  // The community admin sees the same facts in the editable card.
  if (!tenantId || canChangeSettings() || !tenantQuery.data) return null;
  return <p className="text-sm">{remindersSentence(tenantQuery.data.settings_json?.billing_reminders)}</p>;
}
