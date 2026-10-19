'use client';

import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useReminderLog, type DefaulterScope } from '@/hooks/use-defaulters';
import { ApiError, friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';

const STATUS: Record<string, string> = {
  sent: 'Sent',
  failed: 'Failed',
  pending: 'Sending',
  skipped_no_email: 'No e-mail address',
  skipped_disabled: 'Turned off',
};

/** Setup › Defaulters › Defaulter Reminder Logs (INC-S12): automatic and manual reminders. */
export function ReminderLogList({ scope }: { scope?: DefaulterScope } = {}): ReactNode {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const log = useReminderLog(from, to, page, scope);
  const rows = log.data?.data ?? [];
  const total = log.data?.total ?? 0;

  function body(): ReactNode {
    if (log.isError) {
      const missing = log.error instanceof ApiError && log.error.status === 404;
      return <p className="text-sm text-muted-foreground">{missing ? 'The reminder log is not available yet on this server.' : friendlyError(log.error)}</p>;
    }
    if (!log.isLoading && rows.length === 0) return <p className="text-sm text-muted-foreground">No reminders sent yet.</p>;
    return (
      <Table aria-label="Defaulter Reminder Logs">
        <TableHeader>
          <TableRow>
            {['Sent On', 'Unit', 'Recipient', 'Channel', 'Trigger', 'Status', 'Notes'].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{formatDate(row.sent_on)}</TableCell>
              <TableCell>{row.unit_label}</TableCell>
              <TableCell>{row.recipient ?? '—'}</TableCell>
              <TableCell>{row.channel === 'inapp' ? 'In-app' : row.channel === 'sms' ? 'SMS' : 'Email'}</TableCell>
              <TableCell>{row.trigger === 'automatic' ? 'Automatic' : 'Manual'}</TableCell>
              <TableCell>{STATUS[row.status] ?? row.status}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.notes === 'transport_disabled' ? 'E-mail is not configured on the server' : row.notes ?? ''}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Card id="reminder-log">
      <CardHeader>
        <CardTitle>Defaulter Reminder Logs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Input aria-label="From date" type="date" className="w-40" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <span className="text-xs text-muted-foreground">to</span>
          <Input aria-label="To date" type="date" className="w-40" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        {body()}
        {total > 50 && (
          <div className="flex items-center gap-2 text-sm">
            <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span>Page {page} of {Math.ceil(total / 50)}</span>
            <Button type="button" variant="outline" size="sm" disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
