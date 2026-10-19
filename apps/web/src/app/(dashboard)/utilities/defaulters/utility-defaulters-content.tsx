'use client';

import { type ReactNode } from 'react';
import { useTenant } from '@/hooks/use-tenants';
import { knowsUtilityReminders, useUtilitySettings } from '@/hooks/use-utility-settings';
import { getCurrentTenant } from '@/lib/auth';
import { DefaultersContent, type DefaultersPlace } from '@/app/(dashboard)/income/defaulters/defaulters-content';
import { composerDefaults, DEFAULT_UTILITY_REMINDER } from '@/app/(dashboard)/income/defaulters/reminder-template';
import { ReminderLogList } from '@/app/(dashboard)/income/setup/defaulters/reminder-log-list';
import { UtilityReminderTextCard } from './utility-reminder-text-card';

const UTILITY_DEFAULTERS: DefaultersPlace = {
  title: 'Utility Defaulters',
  basePath: '/utilities/defaulters',
  setupHref: '/utilities/defaulters#utility-reminder-text',
  logHref: '/utilities/defaulters#reminder-log',
};

/**
 * Utility Tracker › Defaulters (UTIL-S11): the Income Tracker Defaulters
 * page on the utility ledger. The list holds utility dues only, the
 * composer starts from the utility reminder text and reminds the utility
 * bills only; below it, that text and the utility reminder log.
 */
export function UtilityDefaultersContent(): ReactNode {
  const settings = useUtilitySettings();
  const tenant = useTenant(getCurrentTenant() ?? '');
  const ready = knowsUtilityReminders(settings.data);
  const text = composerDefaults(settings.data?.utility_billing?.reminder_template, tenant.data?.name ?? '', DEFAULT_UTILITY_REMINDER);
  return (
    <div className="space-y-6">
      <DefaultersContent
        scope="utility"
        place={UTILITY_DEFAULTERS}
        composerText={text}
        sendUnavailable={settings.isLoading || ready ? null : 'Sending utility reminders is not available yet on this server.'}
      />
      {ready && <UtilityReminderTextCard />}
      <section id="reminder-log" className="space-y-2">
        <ReminderLogList scope="utility" />
      </section>
    </div>
  );
}
