'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { TableCell, TableRow } from '@/components/ui/table';
import type { ReportResult, ReportSection } from '@/hooks/use-reports';
import { cellDisplay, totalsCells } from './report-values';

type Row = Record<string, unknown> & { __index: number };

const PAGE_SIZES = [25, 50, 100, 500] as const;

function alignClass(type: string, align?: string): string | undefined {
  const side = align ?? (type === 'money' || type === 'number' || type === 'percent' ? 'right' : 'left');
  return side === 'right' ? 'text-right tabular-nums' : side === 'center' ? 'text-center' : undefined;
}

function columnsOf(section: ReportSection): DataTableColumn<Row>[] {
  return section.columns.map((column) => ({
    key: column.key,
    header: column.label,
    cell: (row) => cellDisplay(column, row[column.key]),
    className: alignClass(column.type, column.align),
  }));
}

function TotalsRow({ section }: { section: ReportSection }): ReactNode {
  const cells = totalsCells(section);
  if (!cells) return null;
  return (
    <TableRow className="font-semibold">
      <TableCell />
      {cells.map((text, index) => (
        <TableCell key={section.columns[index].key} className={alignClass(section.columns[index].type, section.columns[index].align)}>
          {text}
        </TableCell>
      ))}
    </TableRow>
  );
}

/** One result section: its heading, the shared table (S.No, pager) and its totals row. */
function SectionTable({ section, title }: { section: ReportSection; title: string }): ReactNode {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const rows: Row[] = section.rows.map((row, index) => ({ ...row, __index: index }));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  return (
    <section className="space-y-2" aria-label={section.heading ?? title}>
      {section.heading && <h3 className="text-base font-semibold">{section.heading}</h3>}
      <DataTable<Row>
        title={section.heading ? `${title} - ${section.heading}` : title}
        columns={columnsOf(section)}
        rows={visible}
        rowKey={(row) => String(row.__index)}
        total={rows.length}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        emptyText="Nothing to show for these options"
        footer={<TotalsRow section={section} />}
      />
    </section>
  );
}

/** The run's output: one table per section, after the 2,000-row banner when cut short. */
export function ReportOutput({
  result,
  totalRows,
  truncated,
}: {
  result: ReportResult;
  totalRows: number;
  truncated: boolean;
}): ReactNode {
  const shown = result.sections.reduce((count, section) => count + section.rows.length, 0);
  const empty = shown === 0;
  return (
    <div className="space-y-6">
      {truncated && (
        <p role="status" className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          {`Showing the first ${shown.toLocaleString('en-IN')} of ${totalRows.toLocaleString('en-IN')} rows — export for all of them`}
        </p>
      )}
      {empty ? (
        <p className="text-sm text-muted-foreground">Nothing to show for these options</p>
      ) : (
        result.sections.map((section, index) => <SectionTable key={`${section.heading ?? 'section'}-${index}`} section={section} title={result.title} />)
      )}
    </div>
  );
}
