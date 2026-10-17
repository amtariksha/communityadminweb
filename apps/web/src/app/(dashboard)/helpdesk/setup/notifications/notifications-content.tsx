'use client';

import { useMemo, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { useHelpdeskSettings, useSaveHelpdeskSettings } from '@/hooks';
import type { HelpdeskSettingsUpdate } from '@/hooks';
import { NotificationAlertsForm } from './notification-alerts-form';
import { SetupLinks } from '../setup-links';

// Roles the API lets save; others who can open the page see it read-only.
const SAVE_ROLES = new Set(['super_admin', 'community_admin']);

export default function NotificationsContent(): ReactNode {
  const { addToast } = useToast();
  const settingsQuery = useHelpdeskSettings();
  const saveMutation = useSaveHelpdeskSettings();

  const role = useMemo(() => currentRole(), []);
  const canEdit = role !== null && SAVE_ROLES.has(role);

  async function handleSave(update: HelpdeskSettingsUpdate): Promise<void> {
    try {
      await saveMutation.mutateAsync(update);
      addToast({ title: 'Notification alerts saved', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Could not save the notification alerts',
        description: friendlyError(error),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Alerts"
        description="Choose which helpdesk events are also sent by email."
      />
      <SetupLinks current="notifications" />
      <Card>
        <CardContent className="pt-6">
          {settingsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : settingsQuery.isError || !settingsQuery.data ? (
            <p role="alert" className="text-sm text-destructive">
              The notification alerts could not be loaded. Reload the page to try again.
            </p>
          ) : (
            <NotificationAlertsForm
              // A fresh copy of the saved settings resets the form after Save Changes.
              key={settingsQuery.dataUpdatedAt}
              settings={settingsQuery.data}
              canEdit={canEdit}
              isSaving={saveMutation.isPending}
              onSave={handleSave}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
