'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAmcCalendar, type AmcCalendarEntry, type AmcCalendarMonth } from '@/hooks/use-amc-contracts';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const KIND_WORDS: Readonly<Record<AmcCalendarEntry['kind'], string>> = { payment: 'Payment due', service: 'Service due', end: 'Contract ends' };

/** The years offered: this one ± 25 (VEND-S7). */
export function calendarYears(currentYear: number): number[] {
  return Array.from({ length: 51 }, (_, index) => currentYear - 25 + index);
}

function MonthEntries({ month }: { month: AmcCalendarMonth }): ReactNode {
  if (month.items.length === 0) return <p className="text-sm text-muted-foreground">Nothing scheduled in {MONTH_NAMES[month.month - 1]}.</p>;
  return (
    <Table aria-label={`${MONTH_NAMES[month.month - 1]} entries`}>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Contract</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {month.items.map((item, index) => (
          <TableRow key={`${item.contract_id}-${item.kind}-${item.date}-${index}`}>
            <TableCell>{formatDate(item.date)}</TableCell>
            <TableCell>{item.title}</TableCell>
            <TableCell>{item.vendor_name}</TableCell>
            <TableCell>{KIND_WORDS[item.kind]}</TableCell>
            <TableCell className="text-right">{item.amount ? formatCurrency(Number(item.amount)) : ''}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Months({ months, open, onOpen }: { months: AmcCalendarMonth[]; open: number | null; onOpen: (month: number) => void }): ReactNode {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {months.map((month) => (
        <Button key={month.month} type="button" variant={open === month.month ? 'default' : 'outline'} onClick={() => onOpen(month.month)}>
          {MONTHS[month.month - 1]} ({month.counts.total})
        </Button>
      ))}
    </div>
  );
}

/** Vendor Master › AMCs › Calendar (VEND-S7, VEND-12): a year of what is due on every active contract. */
export function AmcCalendar(): ReactNode {
  const currentYear = Number(todayIST().slice(0, 4));
  const [chosen, setChosen] = useState(currentYear);
  const [fetched, setFetched] = useState<number | null>(currentYear);
  const [open, setOpen] = useState<number | null>(null);
  const query = useAmcCalendar(fetched);

  function body(): ReactNode {
    if (query.isLoading) return <Skeleton className="h-24 w-full" />;
    if (isNotDeployed(query.error)) return <p className="text-sm text-muted-foreground">The AMC calendar is not available yet.</p>;
    if (query.error || !query.data) return <p role="alert" className="text-sm text-destructive">{friendlyError(query.error)}</p>;
    const month = open ? query.data.months[open - 1] : null;
    return (
      <div className="space-y-4">
        <h4 className="font-semibold">{query.data.year} - Calendar</h4>
        <Months months={query.data.months} open={open} onOpen={setOpen} />
        {month && <MonthEntries month={month} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">AMC Calendar</h3>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="amc-year">Year</Label>
          <Select id="amc-year" value={String(chosen)} onChange={(e) => setChosen(Number(e.target.value))}>
            {calendarYears(currentYear).map((year) => <option key={year} value={year}>{year}</option>)}
          </Select>
        </div>
        <Button type="button" onClick={() => { setFetched(chosen); setOpen(null); }}>Fetch</Button>
      </div>
      {body()}
    </div>
  );
}
