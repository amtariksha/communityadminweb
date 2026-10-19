'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePublishReports, type CatalogueRow, type PublishOutcome } from '@/hooks/use-reports';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { notDeployed } from '../catalogue-state';
import { ReportParamField } from '../run/report-param-fields';
import { initialValues, requestParams, type ParamValue } from '../run/report-param-state';
import { AUDIENCES, outcomeText } from './publish-state';

interface Line {
  row: CatalogueRow;
  values: Record<string, ParamValue>;
  title: string;
  open: boolean;
}

function OptionsCell({ line, onChange }: { line: Line; onChange: (patch: Partial<Line>) => void }): ReactNode {
  const today = todayIST();
  if (line.row.params.length === 0) return <span className="text-muted-foreground">—</span>;
  if (!line.open) {
    return (
      <Button type="button" variant="link" className="px-0" onClick={() => onChange({ open: true })}>
        Set options
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {line.row.params.map((param) => (
        <ReportParamField
          key={param.key}
          param={param}
          today={today}
          value={line.values[param.key]}
          onChange={(value) => onChange({ values: { ...line.values, [param.key]: value } })}
        />
      ))}
    </div>
  );
}

function PublishLines({
  lines,
  outcomes,
  update,
  remove,
}: {
  lines: readonly Line[];
  outcomes: readonly PublishOutcome[] | null;
  update: (key: string, patch: Partial<Line>) => void;
  remove: (key: string) => void;
}): ReactNode {
  return (
    <Table aria-label="Reports to publish">
      <TableHeader>
        <TableRow>
          <TableHead>Report</TableHead>
          <TableHead>Options</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => {
          const outcome = outcomes?.find((candidate) => candidate.key === line.row.key);
          return (
            <TableRow key={line.row.key}>
              <TableCell className="space-y-1">
                <div className="font-medium">{line.row.name}</div>
                <Input aria-label={`Title for ${line.row.name}`} placeholder="Title (optional)" value={line.title} maxLength={200} onChange={(event) => update(line.row.key, { title: event.target.value })} />
              </TableCell>
              <TableCell>
                <OptionsCell line={line} onChange={(patch) => update(line.row.key, patch)} />
              </TableCell>
              <TableCell>
                {outcome ? (
                  outcomeText(outcome)
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => remove(line.row.key)}>
                    Remove
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** The dialog's body: lines, shared fields and results. */
export function PublishPanel({
  rows,
  initialParams,
  onClose,
}: {
  rows: readonly CatalogueRow[];
  initialParams?: Record<string, Record<string, ParamValue>>;
  onClose: () => void;
}): ReactNode {
  const today = todayIST();
  const publish = usePublishReports();
  const [lines, setLines] = useState<Line[]>(() =>
    rows.map((row) => ({ row, values: { ...initialValues(row.params, today), ...(initialParams?.[row.key] ?? {}) }, title: '', open: false })),
  );
  const [audience, setAudience] = useState('all');
  const [expiresOn, setExpiresOn] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const update = (key: string, patch: Partial<Line>): void =>
    setLines((current) => current.map((line) => (line.row.key === key ? { ...line, ...patch } : line)));
  const remove = (key: string): void => setLines((current) => current.filter((line) => line.row.key !== key));

  function submit(): void {
    const items = [];
    for (const line of lines) {
      const request = requestParams(line.row.params, line.values);
      if ('error' in request) {
        setProblem(`${line.row.name}: ${request.error}`);
        return;
      }
      items.push({ key: line.row.key, params: request.params, ...(line.title.trim() ? { title: line.title.trim() } : {}) });
    }
    setProblem(null);
    publish.mutate({ items, audience, ...(expiresOn ? { expires_on: expiresOn } : {}) });
  }

  const error = publish.error ? (notDeployed(publish.error) ? 'Publishing is not available yet.' : friendlyError(publish.error)) : null;
  return (
    <div className="space-y-3">
      <PublishLines lines={lines} outcomes={publish.data?.data ?? null} update={update} remove={remove} />
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label htmlFor="publish-audience">Audience</Label>
          <Select id="publish-audience" aria-label="Audience" value={audience} onChange={(event) => setAudience(event.target.value)}>
            {AUDIENCES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="publish-expiry">Expiry date</Label>
          <Input id="publish-expiry" type="date" min={today} className="w-40" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
        </div>
      </div>
      {(problem ?? error) && (
        <p role="alert" className="text-sm text-destructive">
          {problem ?? error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" disabled={lines.length === 0 || publish.isPending || Boolean(publish.data)} onClick={submit}>
          {publish.isPending ? 'Publishing…' : 'Publish'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

/** Publish selected reports (REP-S4): one notice per report, its PDF attached. */
export function PublishDialog({
  rows,
  initialParams,
  open,
  onOpenChange,
}: {
  rows: readonly CatalogueRow[];
  initialParams?: Record<string, Record<string, ParamValue>>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Publish to Notice Board</DialogTitle>
        </DialogHeader>
        {open && <PublishPanel rows={rows} initialParams={initialParams} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
