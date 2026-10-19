'use client';

import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CatalogueRow } from '@/hooks/use-reports';
import { runHref, type IndexSection } from './report-index-model';

interface ReportIndexTableProps {
  section: IndexSection;
  /** Module page the rows are opened from (run page breadcrumb and Close). */
  from?: string;
}

function ReportName({ row, from }: { row: CatalogueRow; from?: string }): ReactNode {
  if (!row.available) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <span>{row.name}</span>
        <Badge variant="outline">Planned</Badge>
      </div>
    );
  }
  return (
    <div>
      <Link href={runHref(row.key, from)} className="font-medium text-primary hover:underline">
        {row.name}
      </Link>
      {row.description && <p className="text-xs text-muted-foreground">{row.description}</p>}
    </div>
  );
}

// Schedule (REP-08) and Publish (REP-09) are not built yet: shown, disabled.
function ScheduleCell({ row }: { row: CatalogueRow }): ReactNode {
  return (
    <Button type="button" variant="outline" size="sm" disabled title="Scheduling comes with a later release">
      {row.active_schedules.length > 0 ? `${row.active_schedules[0].frequency} ✓` : 'Schedule'}
    </Button>
  );
}

function PublishCell({ row }: { row: CatalogueRow }): ReactNode {
  return <input type="checkbox" disabled aria-label={`Publish ${row.name}`} className="h-4 w-4" />;
}

/** One module section of the index: No. · Report Name · Schedule Report · Publish Report. */
export function ReportIndexTable({ section, from }: ReportIndexTableProps): ReactNode {
  return (
    <section aria-label={section.title} className="space-y-2">
      <h3 className="text-base font-semibold">{`${section.section}. ${section.title}`}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">No.</TableHead>
            <TableHead>Report Name</TableHead>
            <TableHead className="w-40">Schedule Report</TableHead>
            <TableHead className="w-32">Publish Report</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {section.groups.map((group, index) => (
            <Fragment key={`${group.heading ?? 'ungrouped'}-${index}`}>
              {group.heading && (
                <TableRow>
                  <TableCell colSpan={4} className="bg-muted/50 font-semibold">
                    {group.heading}
                  </TableCell>
                </TableRow>
              )}
              {group.rows.map((row) => (
                <TableRow key={row.key} data-report-key={row.key}>
                  <TableCell>{row.number ?? '—'}</TableCell>
                  <TableCell>
                    <ReportName row={row} from={from} />
                  </TableCell>
                  <TableCell>{row.schedulable ? <ScheduleCell row={row} /> : null}</TableCell>
                  <TableCell>{row.publishable ? <PublishCell row={row} /> : null}</TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
