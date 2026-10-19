'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { useEscalationMatrix, useHelpdeskAssignees, useNotificationChannels, useSaveEscalationRow } from '@/hooks';
import type { EscalationRow, EscalationRowInput } from '@/hooks';
import { EXPORT_COLUMNS, EscalationMatrix, toExportRows } from './escalation-matrix';
import { EscalationRowEditor } from './escalation-row-editor';
import { SetupLinks } from '../setup/setup-links';

// Roles the API lets save a row; everyone else who can open the page views it.
const SAVE_ROLES = new Set(['super_admin', 'community_admin']);

export default function EscalationContent(): ReactNode {
  const { addToast } = useToast();
  const matrixQuery = useEscalationMatrix();
  const channels = useNotificationChannels();
  const assigneesQuery = useHelpdeskAssignees();
  const saveMutation = useSaveEscalationRow();
  const [viewing, setViewing] = useState<EscalationRow | null>(null);

  const role = useMemo(() => currentRole(), []);
  const canEdit = role !== null && SAVE_ROLES.has(role);
  const rows = matrixQuery.data ?? [];

  async function handleSave(categoryId: string, body: EscalationRowInput): Promise<void> {
    try {
      await saveMutation.mutateAsync({ categoryId, body });
      addToast({ title: 'Escalation matrix saved', variant: 'success' });
      setViewing(null);
    } catch (error) {
      addToast({
        title: 'Could not save the escalation matrix',
        description: friendlyError(error),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Setup Escalation Matrix"
        description="A request that stays at a level longer than its window moves to the next owner."
        actions={
          <ExportButton
            label="Export Escalation Matrix to Excel"
            data={toExportRows(rows)}
            filename={`escalation-matrix-${new Date().toISOString().split('T')[0]}`}
            columns={[...EXPORT_COLUMNS]}
          />
        }
      />
      <SetupLinks current="escalation" />
      <Card>
        <CardContent className="pt-6">
          {matrixQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : matrixQuery.isError ? (
            <p role="alert" className="text-sm text-destructive">
              The escalation matrix could not be loaded. Reload the page to try again.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <span>Add categories in Setup first</span>{' '}
              <Link href="/helpdesk/setup/categories" className="text-primary hover:underline">
                Setup
              </Link>
            </p>
          ) : (
            <EscalationMatrix rows={rows} onView={setViewing} />
          )}
        </CardContent>
      </Card>
      <EscalationRowEditor
        smsAvailable={channels.data?.sms ?? false}
        row={viewing}
        owners={assigneesQuery.data ?? []}
        canEdit={canEdit}
        isSaving={saveMutation.isPending}
        onSave={handleSave}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}
