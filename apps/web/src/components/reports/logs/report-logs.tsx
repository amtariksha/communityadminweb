'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useReportLogs, type CatalogueRow, type ReportLogRow } from '@/hooks/use-reports';
import { notDeployed } from '../catalogue-state';
import { ACTION_LABELS, formatText, optionsText, resultText } from './report-log-text';

const INDIA_TIME = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function LogLine({ row }: { row: ReportLogRow }): ReactNode {
  const action = ACTION_LABELS[row.action] ?? row.action;
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">{INDIA_TIME.format(new Date(row.at))}</TableCell>
      <TableCell>{row.user_name ?? (row.user_id ? '—' : 'Schedule')}</TableCell>
      <TableCell>{row.report_name}</TableCell>
      <TableCell className="text-xs">{optionsText(row.options)}</TableCell>
      <TableCell>
        {row.announcement_id ? (
          <Link href="/announcements" className="text-primary hover:underline">
            {action}
          </Link>
        ) : (
          action
        )}
      </TableCell>
      <TableCell>{formatText(row.format)}</TableCell>
      <TableCell className="text-right">{row.row_count ?? '—'}</TableCell>
      <TableCell>{resultText(row)}</TableCell>
    </TableRow>
  );
}

function LogTable({ rows }: { rows: readonly ReportLogRow[] }): ReactNode {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No activity in this period</p>;
  return (
    <Table aria-label="Report logs">
      <TableHeader>
        <TableRow>
          {['When', 'Who', 'Report', 'Options', 'Action', 'Format', 'Rows', 'Result'].map((heading) => (
            <TableHead key={heading}>{heading}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <LogLine key={`${row.at}-${row.action}-${index}`} row={row} />
        ))}
      </TableBody>
    </Table>
  );
}

/** Show Logs (REP-S5): one report's activity, or every report's on the index. */
export function ReportLogsPanel({ reportKey, reports }: { reportKey?: string; reports?: readonly CatalogueRow[] }): ReactNode {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [chosen, setChosen] = useState('');
  const logs = useReportLogs({ reportKey: reportKey ?? (chosen || undefined), from: from || undefined, to: to || undefined });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="logs-from">From</Label>
          <Input id="logs-from" type="date" className="w-40" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="logs-to">To</Label>
          <Input id="logs-to" type="date" className="w-40" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        {!reportKey && reports && (
          <div className="space-y-1">
            <Label htmlFor="logs-report">Report</Label>
            <Select id="logs-report" aria-label="Report" value={chosen} onChange={(event) => setChosen(event.target.value)}>
              <option value="">All reports</option>
              {reports.filter((row) => row.available).map((row) => (
                <option key={row.key} value={row.key}>
                  {row.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      {logs.data ? (
        <LogTable rows={logs.data.data} />
      ) : notDeployed(logs.error) ? (
        <p className="text-sm text-muted-foreground">Logs are not available yet.</p>
      ) : logs.isError ? (
        <p role="alert" className="text-sm text-destructive">Could not load the logs.</p>
      ) : (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}

/** The Show Logs button of Admin Reports and of a report's run page. */
export function ReportLogsButton({ reportKey, reports }: { reportKey?: string; reports?: readonly CatalogueRow[] }): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Show Logs
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Report logs</DialogTitle>
          </DialogHeader>
          {open && <ReportLogsPanel reportKey={reportKey} reports={reports} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
