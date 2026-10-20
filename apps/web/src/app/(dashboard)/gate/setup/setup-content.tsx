'use client';

import { useMemo, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useGateSettings,
  useUpdateGateSettings,
  type GateSettingsChanges,
  type GateSwitches,
} from '@/hooks/use-gate-settings';
import { canWriteGateSetup, NotAvailableYet, SetupBlock } from './blocks/setup-block';
import { GuardAppBlock } from './blocks/guard-app-block';
import { CheckinAlertBlock } from './blocks/checkin-alert-block';
import { GatesBlock } from './blocks/gates-block';
import { EntryReasonsBlock } from './blocks/entry-reasons-block';
import { IncidentCategoriesBlock } from './blocks/incident-categories-block';
import { PassFooterBlock } from './blocks/pass-footer-block';
import { GuardRosterBlock } from './blocks/guard-roster-block';
import { EmergencyNumbersBlock, ResidentCategoriesBlock } from './blocks/link-blocks';
import { OverstayBlock } from './blocks/overstay-block';

/**
 * Gate & Visitors › Setup (GATE-S1): one page of independent blocks, each
 * with its own Save; saving one block never touches another: guard app,
 * check-in alert, gates, entry reasons, resident categories, pass footer,
 * emergency numbers, incident categories, guard roster, overstay.
 */
export function GateSetupContent(): ReactNode {
  const { addToast } = useToast();
  const editable = useMemo(() => canWriteGateSetup(), []);
  const settingsQuery = useGateSettings();
  const update = useUpdateGateSettings();
  const settings = settingsQuery.data;

  async function saveSettings(changes: GateSettingsChanges): Promise<void> {
    await update.mutateAsync(changes);
    addToast({ title: 'Gate settings saved', variant: 'success' });
  }
  const saveSwitches = (changes: Partial<GateSwitches>) => saveSettings({ gate_settings: changes });
  // Remount the setting blocks on fresh data so they show what was saved.
  const version = settingsQuery.dataUpdatedAt;

  if (settingsQuery.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      {settings === null || settingsQuery.isError ? (
        <SetupBlock title="Guard App Settings">
          {settingsQuery.isError ? (
            <p role="alert" className="text-sm text-destructive">The gate settings could not be loaded. Reload the page to try again.</p>
          ) : (
            <NotAvailableYet what="Gate settings" />
          )}
        </SetupBlock>
      ) : settings ? (
        <>
          <GuardAppBlock key={`app-${version}`} switches={settings.gate_settings} editable={editable} save={saveSwitches} />
          <CheckinAlertBlock key={`alert-${version}`} switches={settings.gate_settings} editable={editable} save={saveSwitches} />
        </>
      ) : null}
      <GatesBlock editable={editable} />
      <EntryReasonsBlock editable={editable} />
      <ResidentCategoriesBlock />
      {settings ? (
        <PassFooterBlock key={`footer-${version}`} switches={settings.gate_settings} editable={editable} save={saveSwitches} />
      ) : null}
      <EmergencyNumbersBlock />
      <IncidentCategoriesBlock editable={editable} />
      <GuardRosterBlock />
      {settings ? <OverstayBlock key={`stay-${version}`} settings={settings} editable={editable} save={saveSettings} /> : null}
    </div>
  );
}
