'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useMemberCategories } from '@/hooks/use-categories-kyc';
import { useUnitBlocks } from '@/hooks/use-unit-blocks';
import { useUnitBillingCategories } from '@/hooks/use-unit-billing-categories';
import { useUnit, useUpdateUnit } from '@/hooks/use-units';
import { friendlyError } from '@/lib/api-error';
import { canReadFinance } from '@/lib/finance-roles';
import { UnitEditForm } from '../components/unit-edit-form';
import type { UnitRecord } from '../components/unit-edit-values';
import { blockUnitLabel, unitPanelHref } from './unit-labels';

/**
 * Approved Users › View/Edit Unit details as a page (UNIT-16, classic SB-07):
 * the unit's every field, Show Logs and Close back to the unit panel.
 */
export function UnitEditPage({ unitId }: { unitId: string }): ReactNode {
  const unitQuery = useUnit(unitId);
  const categories = useMemberCategories();
  const blocks = useUnitBlocks();
  const billing = useUnitBillingCategories({ enabled: canReadFinance() });
  const update = useUpdateUnit();
  const { addToast } = useToast();
  const unit = unitQuery.data as UnitRecord | undefined;

  if (unitQuery.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!unit) return <p className="text-sm text-muted-foreground">Unit not found.</p>;

  function save(changes: Record<string, unknown>): void {
    if (Object.keys(changes).length === 0) return;
    update.mutate(
      { id: unitId, data: changes },
      {
        onSuccess: () => addToast({ title: 'Unit updated', variant: 'success' }),
        onError: (error) => addToast({ title: 'Failed to update unit', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <h2 className="text-lg font-semibold">Unit: {blockUnitLabel({ block: unit.block ?? null, unit_number: unit.unit_number })}</h2>
        <UnitEditForm
          unit={unit}
          categories={categories.data ?? []}
          billingTypes={billing.isSuccess ? billing.data.data : null}
          blocks={(blocks.data?.data ?? []).map((block) => block.name)}
          saving={update.isPending}
          error={update.error}
          onSave={save}
          actions={
            <>
              <ShowLogsButton recordTypes={['unit']} recordId={unitId} />
              <Link href={unitPanelHref(unitId)} className={buttonVariants({ variant: 'outline' })}>
                Close
              </Link>
            </>
          }
        />
      </CardContent>
    </Card>
  );
}
