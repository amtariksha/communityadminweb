'use client';

import { useMemo, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import {
  useHelpdeskCategories,
  useHelpdeskSettings,
  useSaveHelpdeskCategories,
  useSaveHelpdeskSettings,
} from '@/hooks';
import { SetupLinks } from '../setup-links';
import { AutoResponsesForm, type AutoResponsesPayload } from './auto-responses-form';

// Roles the API lets save; others who can open the page see it read-only.
const SAVE_ROLES = new Set(['super_admin', 'community_admin']);

export default function AutoResponsesContent(): ReactNode {
  const { addToast } = useToast();
  const settingsQuery = useHelpdeskSettings();
  const categoriesQuery = useHelpdeskCategories();
  const saveSettings = useSaveHelpdeskSettings();
  const saveCategories = useSaveHelpdeskCategories();

  const role = useMemo(() => currentRole(), []);
  const canEdit = role !== null && SAVE_ROLES.has(role);

  async function handleSave(payload: AutoResponsesPayload): Promise<void> {
    try {
      await saveSettings.mutateAsync(payload.settings);
      if (payload.categoryRows) {
        await saveCategories.mutateAsync(payload.categoryRows);
      }
      addToast({ title: 'Automated responses saved', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Could not save the automated responses',
        description: friendlyError(error),
        variant: 'destructive',
      });
    }
  }

  const isLoading = settingsQuery.isLoading || categoriesQuery.isLoading;
  const loadFailed = settingsQuery.isError || categoriesQuery.isError || !settingsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automated Responses"
        description="Reply to residents automatically when they raise a request."
      />
      <SetupLinks current="auto-responses" />
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : loadFailed ? (
            <p role="alert" className="text-sm text-destructive">
              The automated responses could not be loaded. Reload the page to try again.
            </p>
          ) : (
            <AutoResponsesForm
              // Fresh copies of the saved data reset the form after Save Changes.
              key={`${settingsQuery.dataUpdatedAt}-${categoriesQuery.dataUpdatedAt}`}
              settings={settingsQuery.data!}
              categories={categoriesQuery.data ?? []}
              canEdit={canEdit}
              isSaving={saveSettings.isPending || saveCategories.isPending}
              onSave={handleSave}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
