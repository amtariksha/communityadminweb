'use client';

import { type ReactNode } from 'react';
import { Scale } from 'lucide-react';
import type { FinancialYear, GstThresholdMethod } from '@communityos/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useFinancialYears, useSetGstThresholdMethod } from '@/hooks';
import { ApiError, friendlyError } from '@/lib/api-error';
import { canWriteFinance } from '@/lib/finance-roles';
import { GST_METHOD_LABELS, GST_METHODS, methodOf } from '@/lib/gst-threshold-method';
import { formatDate } from '@/lib/utils';

interface YearRowProps {
  year: FinancialYear;
  editable: boolean;
}

function YearRow({ year, editable }: YearRowProps): ReactNode {
  const { addToast } = useToast();
  const setMethod = useSetGstThresholdMethod();

  function change(method: GstThresholdMethod): void {
    setMethod.mutate(
      { id: year.id, method },
      {
        onSuccess: () =>
          addToast({ title: `${year.label}: GST ${GST_METHOD_LABELS[method].toLowerCase()}`, description: 'Applies to invoices raised from now on.', variant: 'success' }),
        onError: (error) =>
          addToast({
            title: `Could not change ${year.label}`,
            description: error instanceof ApiError && error.status === 404 ? 'This setting is not available yet on this server.' : friendlyError(error),
            variant: 'destructive',
          }),
      },
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex items-center gap-2 font-medium">
          {year.label}
          {year.is_frozen && <Badge variant="secondary">Frozen</Badge>}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(String(year.start_date))} - {formatDate(String(year.end_date))}
        </p>
      </div>
      <select
        aria-label={`GST above ₹7,500 for ${year.label}`}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
        value={methodOf(year)}
        disabled={!editable || year.is_frozen || setMethod.isPending}
        onChange={(event) => change(event.target.value as GstThresholdMethod)}
      >
        {GST_METHODS.map((method) => (
          <option key={method} value={method}>
            {GST_METHOD_LABELS[method]}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Income › Setup › GST: how each financial year charges GST once a unit's
 * monthly charge passes ₹7,500 (INC-16 follow-up). Every year starts on
 * "only above ₹7,500"; a frozen year keeps its method.
 */
export function GstThresholdYearsCard(): ReactNode {
  const yearsQuery = useFinancialYears();
  const years = yearsQuery.data ?? [];
  // A server without the setting sends no method: show it, but nothing to change yet.
  const supported = years.length === 0 || years.some((year) => year.gst_threshold_method !== undefined);
  const editable = supported && canWriteFinance();

  return (
    <Card id="gst-threshold">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          GST above ₹7,500 a month
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          For each financial year, how GST is charged once a unit&apos;s monthly charge passes ₹7,500. A change applies to
          invoices raised from now on; invoices already posted keep their GST. A frozen year cannot be changed.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {yearsQuery.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : years.length === 0 ? (
          <p className="text-sm text-muted-foreground">No financial years yet. Add one under Settings › Financial Years.</p>
        ) : (
          years.map((year) => <YearRow key={year.id} year={year} editable={editable} />)
        )}
        {!supported && <p className="text-sm text-muted-foreground">Changing this is not available yet on this server.</p>}
        {supported && !editable && years.length > 0 && (
          <p className="text-sm text-muted-foreground">Only a community admin or accountant can change this.</p>
        )}
      </CardContent>
    </Card>
  );
}
