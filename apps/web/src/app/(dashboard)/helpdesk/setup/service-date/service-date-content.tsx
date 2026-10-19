'use client';

import { useMemo, type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useHelpdeskSettings, useSaveHelpdeskSettings } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { SetupLinks } from '../setup-links';
import { ServiceDateSwitches, type ServiceDateSettings } from './service-date-switches';

// Roles the API lets save; others who can open the page see it read-only.
const SAVE_ROLES = new Set(['super_admin', 'community_admin']);

export default function ServiceDateContent(): ReactNode {
  const { addToast } = useToast();
  const settingsQuery = useHelpdeskSettings();
  const save = useSaveHelpdeskSettings();
  const role = useMemo(() => currentRole(), []);
  const canEdit = role !== null && SAVE_ROLES.has(role);
  const settings = settingsQuery.data;
  // An API without HELP-16 does not send the switches.
  const available = settings?.allow_resident_add_psd !== undefined;

  async function handleSave(update: Partial<ServiceDateSettings>): Promise<void> {
    try {
      await save.mutateAsync(update);
      addToast({ title: 'Preferred service date setting saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the setting', description: friendlyError(error), variant: 'destructive' });
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Setup Preferred Service Date" description="Whether residents may name the day that suits them." />
      <SetupLinks current="service-date" />
      <Card>
        <CardContent className="pt-6">
          {settingsQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : settingsQuery.isError || !settings ? (
            <p role="alert" className="text-sm text-destructive">
              The setting could not be loaded. Reload the page to try again.
            </p>
          ) : !available ? (
            <p className="text-sm text-muted-foreground">This setting is not available yet.</p>
          ) : (
            <ServiceDateSwitches
              settings={{
                allow_resident_add_psd: settings.allow_resident_add_psd === true,
                allow_resident_edit_psd: settings.allow_resident_edit_psd === true,
              }}
              canEdit={canEdit}
              onSave={handleSave}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
