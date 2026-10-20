'use client';

import { useMemo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useSaveTaskCategories, useTaskCategories, type TaskCategoryGridRow } from '@/hooks/use-task-categories';
import { ApiError, friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';
import { MeetingNotificationsCard } from './meeting-notifications-card';
import { MAX_ACTIVE_CATEGORIES, TaskCategoriesGrid } from './task-categories-grid';

// PUT /meetings/task-categories/bulk: MEETING_WRITE_ROLES.
const SAVE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member']);

function saveError(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return 'Saving task categories is not available yet.';
  return friendlyError(error);
}

/** Projects & Meetings › SetUp (PROJ-S1, PROJ-22): the society's task categories. */
export function SetupContent(): ReactNode {
  const { addToast } = useToast();
  const query = useTaskCategories();
  const saveMutation = useSaveTaskCategories();
  const role = useMemo(() => currentRole(), []);

  async function save(rows: TaskCategoryGridRow[]): Promise<void> {
    try {
      await saveMutation.mutateAsync(rows);
      addToast({ title: 'Task categories saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the categories', description: saveError(error), variant: 'destructive' });
      throw error;
    }
  }

  function body(): ReactNode {
    if (query.isLoading) return <Skeleton className="h-32 w-full" />;
    if (isNotDeployed(query.error)) return <p className="text-sm text-muted-foreground">Task categories are not available yet.</p>;
    if (query.isError || !query.data) {
      return <p role="alert" className="text-sm text-destructive">The categories could not be loaded. Reload the page to try again.</p>;
    }
    return (
      <TaskCategoriesGrid
        key={query.dataUpdatedAt}
        categories={query.data}
        readOnly={role === null || !SAVE_ROLES.has(role)}
        isSaving={saveMutation.isPending}
        save={save}
        onTooMany={() => addToast({ title: `At most ${MAX_ACTIVE_CATEGORIES} categories can be active. Retire one first.`, variant: 'destructive' })}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Setup Task Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Up to {MAX_ACTIVE_CATEGORIES} active categories. A retired category keeps its tasks.</p>
          {body()}
        </CardContent>
      </Card>
      {/* PROJ-42 / PROJ-43 — off until a community admin switches them on. */}
      <MeetingNotificationsCard />
    </div>
  );
}
