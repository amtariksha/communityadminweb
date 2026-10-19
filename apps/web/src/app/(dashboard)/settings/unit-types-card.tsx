'use client';

import { useMemo, type ReactNode } from 'react';
import { Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { ApiError, friendlyError } from '@/lib/api-error';
import { canReadFinance, canWriteFinance } from '@/lib/finance-roles';
import { currentRole } from '@/lib/current-role';
import {
  useSaveUnitBillingCategories,
  useUnitBillingCategories,
  type AreaTotals,
  type UnitBillingCategoryList,
  type UnitBillingCategoryRow,
} from '@/hooks/use-unit-billing-categories';
import { UnitTypesGrid } from './unit-types-grid';

const area = (value: number): string => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

function SummaryRow({ label, totals, strong }: { label: string; totals: AreaTotals; strong?: boolean }): ReactNode {
  return (
    <TableRow className={strong ? 'font-medium' : undefined}>
      <TableCell>{label}</TableCell>
      <TableCell className="text-right">{totals.unit_count}</TableCell>
      <TableCell className="text-right">{area(totals.total_sqft1)}</TableCell>
      <TableCell className="text-right">{area(totals.total_sqft2)}</TableCell>
    </TableRow>
  );
}

/** Distribution of active units over the types: one row per type, Unassigned, Total. */
export function UnitTypesSummary({ list }: { list: UnitBillingCategoryList }): ReactNode {
  return (
    <Table aria-label="Units by type">
      <TableHeader>
        <TableRow>
          <TableHead>Distribution</TableHead>
          <TableHead className="text-right">No. of Units</TableHead>
          <TableHead className="text-right">Total Sq.ft 1</TableHead>
          <TableHead className="text-right">Total Sq.ft 2</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.data.map((type) => (
          <SummaryRow key={type.id} label={type.name} totals={type} />
        ))}
        <SummaryRow label="Unassigned" totals={list.unassigned} />
        <SummaryRow label="Total" totals={list.total} strong />
      </TableBody>
    </Table>
  );
}

function LoadState({ error }: { error: unknown }): ReactNode {
  if (error instanceof ApiError && error.status === 404) {
    return <p className="text-sm text-muted-foreground">Unit types are not available yet on this server.</p>;
  }
  return (
    <p role="alert" className="text-sm text-destructive">
      The unit types could not be loaded: {friendlyError(error)}
    </p>
  );
}

/**
 * Settings › Unit types (INC-15): the types a society bills its units by.
 * A unit is set to a type, with its second area, from Edit Unit on /units.
 */
export function UnitTypesCard(): ReactNode {
  const { addToast } = useToast();
  const role = useMemo(() => currentRole(), []);
  const readable = canReadFinance(role);
  const query = useUnitBillingCategories({ enabled: readable });
  const saveMutation = useSaveUnitBillingCategories();
  if (!readable) return null;

  async function save(rows: UnitBillingCategoryRow[]): Promise<void> {
    try {
      await saveMutation.mutateAsync(rows);
      addToast({ title: 'Unit types saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the unit types', description: friendlyError(error), variant: 'destructive' });
      throw error;
    }
  }

  function body(): ReactNode {
    if (query.isLoading) return <Skeleton className="h-24 w-full" />;
    if (query.isError || !query.data) return <LoadState error={query.error} />;
    return (
      <div className="space-y-6">
        <UnitTypesGrid
          key={query.dataUpdatedAt}
          types={query.data.data}
          readOnly={!canWriteFinance(role)}
          isSaving={saveMutation.isPending}
          save={save}
        />
        <UnitTypesSummary list={query.data} />
      </div>
    );
  }

  return (
    <Card id="unit-types">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Unit types
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          The types your units are billed as (for example General, Penthouse, Shop). Set each unit&apos;s
          type and its second area from Edit Unit on the Units page. Blank a name and save to remove a
          type no unit uses.
        </p>
      </CardHeader>
      <CardContent>{body()}</CardContent>
    </Card>
  );
}
