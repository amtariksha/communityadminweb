'use client';

import { useState, type ReactNode } from 'react';
import { CalendarRange, Lock, MoreVertical, Star, Unlock } from 'lucide-react';
import type { FinancialYear } from '@communityos/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';
import { useFinancialYears, useSetCurrentYear, useUnfreezeYear } from '@/hooks';
import { canChangeSettings } from './settings-access';
import { CreateFinancialYearDialog, FreezeYearDialog, YearEndDialog } from './financial-year-dialogs';

interface RowProps {
  year: FinancialYear;
  mayCloseYear: boolean;
  onFreeze: (year: FinancialYear) => void;
  onYearEnd: (year: FinancialYear) => void;
}

function YearMenu({ year, onFreeze }: Pick<RowProps, 'year' | 'onFreeze'>): ReactNode {
  const { addToast } = useToast();
  const setCurrentYear = useSetCurrentYear();
  const unfreezeYear = useUnfreezeYear();
  const report = (done: string, failed: string) => ({
    onSuccess() { addToast({ title: `${year.label} ${done}`, variant: 'success' }); },
    onError(error: Error) { addToast({ title: failed, description: friendlyError(error), variant: 'destructive' }); },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`More for ${year.label}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!year.is_current && (
          <DropdownMenuItem onClick={() => setCurrentYear.mutate(year.id, report('set as current year', 'Failed to set current year'))}>
            <Star className="mr-2 h-4 w-4" />
            Set as Current
          </DropdownMenuItem>
        )}
        {!year.is_frozen && !year.is_current && (
          <DropdownMenuItem onClick={() => onFreeze(year)}>
            <Lock className="mr-2 h-4 w-4" />
            Freeze Year
          </DropdownMenuItem>
        )}
        {year.is_frozen && (
          <DropdownMenuItem onClick={() => unfreezeYear.mutate(year.id, report('unfrozen', 'Failed to unfreeze year'))}>
            <Unlock className="mr-2 h-4 w-4" />
            Unfreeze Year
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function YearRow({ year, mayCloseYear, onFreeze, onYearEnd }: RowProps): ReactNode {
  return (
    <div className="flex items-center justify-between rounded-md border p-4">
      <div className="flex items-center gap-3">
        <CalendarRange className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium">{year.label}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(String(year.start_date))} - {formatDate(String(year.end_date))}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {year.is_current && <Badge variant="success">Current</Badge>}
        {year.is_frozen && <Badge variant="secondary">Frozen</Badge>}
        {!year.is_current && !year.is_frozen && <Badge variant="default">Open</Badge>}
        {mayCloseYear && (
          <Button variant="outline" size="sm" disabled={year.is_frozen} onClick={() => onYearEnd(year)}>
            Perform Year End
          </Button>
        )}
        <YearMenu year={year} onFreeze={onFreeze} />
      </div>
    </div>
  );
}

/**
 * Settings › Financial Years. Perform Year End (GL-06) posts the year's
 * retained-earnings entry and freezes it; only a community admin (or
 * super admin) may, as POST /ledger/financial-years/:id/close allows.
 */
export function FinancialYearsCard(): ReactNode {
  const fyQuery = useFinancialYears();
  const years = fyQuery.data ?? [];
  const mayCloseYear = canChangeSettings();
  const [freezeTarget, setFreezeTarget] = useState<FinancialYear | null>(null);
  const [yearEndTarget, setYearEndTarget] = useState<FinancialYear | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Financial Years</CardTitle>
          <CreateFinancialYearDialog />
        </div>
      </CardHeader>
      <CardContent>
        {fyQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : years.length > 0 ? (
          <div className="space-y-3">
            {years.map((year) => (
              <YearRow
                key={year.id}
                year={year}
                mayCloseYear={mayCloseYear}
                onFreeze={setFreezeTarget}
                onYearEnd={setYearEndTarget}
              />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            No financial years defined. Create one to start recording transactions.
          </p>
        )}
      </CardContent>
      <FreezeYearDialog year={freezeTarget} onClose={() => setFreezeTarget(null)} />
      <YearEndDialog year={yearEndTarget} onClose={() => setYearEndTarget(null)} />
    </Card>
  );
}
