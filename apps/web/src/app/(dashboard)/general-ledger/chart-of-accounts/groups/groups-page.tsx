'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAccountGroups } from '@/hooks';
import { useSaveAccountGroupsBulk } from '@/hooks/use-chart-of-accounts';
import { ApiError, friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { GROUP_GRIDS, GroupGrid, type GridState } from './group-grid';
import { groupErrorsFromApi, groupSaveBody, validateGroups, type GridErrors } from './group-save';

const WRITE_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'accountant']);

/**
 * General Ledger › Chart of Accounts › Groups (GL-13, screen GL-S5): four
 * editable grids — Assets, Liabilities (equity groups included, marked),
 * Income, Expense — and one Save Changes for all. Delete deactivates; the
 * API refuses a group that still has active subgroups or accounts.
 */
export function GroupsPage(): ReactNode {
  const { addToast } = useToast();
  const groupsQuery = useAccountGroups();
  const saveMutation = useSaveAccountGroupsBulk();
  const canSave = useMemo(() => WRITE_ROLES.has(currentRole() ?? ''), []);
  const states = useRef(new Map<string, GridState>());
  const [errors, setErrors] = useState<GridErrors>({});
  const groups = groupsQuery.data ?? [];

  async function save(): Promise<void> {
    const found = validateGroups(GROUP_GRIDS, states.current);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const sent = groupSaveBody(GROUP_GRIDS, states.current, groups);
    if (sent.rows.length + sent.deactivations.length === 0) {
      addToast({ title: 'No changes to save' });
      return;
    }
    try {
      const result = (await saveMutation.mutateAsync({ rows: sent.rows, deactivations: sent.deactivations })).data;
      addToast({ title: 'Groups saved', description: `${result.created} added, ${result.updated} changed, ${result.deactivated} deactivated.`, variant: 'success' });
    } catch (error) {
      setErrors(groupErrorsFromApi(error, sent));
      const missing = error instanceof ApiError && error.status === 404;
      addToast({ title: 'Could not save the groups', description: missing ? 'Saving the groups is not available yet on this server.' : friendlyError(error), variant: 'destructive' });
    }
  }

  if (groupsQuery.isLoading) return <Skeleton className="h-60 w-full" />;
  if (groupsQuery.isError) return <p role="alert" className="text-sm text-destructive">The groups could not be loaded. Reload the page to try again.</p>;
  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <h3 className="font-semibold">Set up Account Groups</h3>
        {!canSave && <p role="note" className="text-sm text-muted-foreground">Only the community admin and the accountant can change groups.</p>}
        {GROUP_GRIDS.map((spec) => (
          <GroupGrid
            // A fresh copy of the saved list resets the grids after a save.
            key={`${spec.slug}-${groupsQuery.dataUpdatedAt}`}
            spec={spec}
            groups={groups}
            readOnly={!canSave}
            errors={errors[spec.slug] ?? {}}
            onChange={(state) => states.current.set(spec.slug, state)}
          />
        ))}
        {canSave && (
          <Button type="button" disabled={saveMutation.isPending} onClick={() => void save()}>
            <Save className="mr-1 h-4 w-4" /> {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
