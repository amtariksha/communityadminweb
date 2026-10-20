'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import {
  useDocumentRanges,
  useSaveDocumentRanges,
  type DocumentRangeList,
  type RangeKind,
  type RangeSeries,
} from '@/hooks/use-billing-documents';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { RangeRow } from './range-row';
import { blankRow, checkRanges, toRangePayload, toRowStates, type RangeRowState } from './range-rows';
import { ValueHeaders } from './range-value-cells';

export interface RangeTableProps {
  series: RangeSeries;
  kind: RangeKind;
  title: string;
  /** "Invoice#" or "Receipt#". */
  numberLabel: string;
  canWrite: boolean;
}

const VALUE_COLUMNS: Record<RangeKind, number> = { footer: 1, prefix: 1, header_title: 1, period: 3 };

function RangeEditor({ series, kind, title, numberLabel, canWrite, list }: RangeTableProps & { list: DocumentRangeList }): ReactNode {
  const { addToast } = useToast();
  const save = useSaveDocumentRanges();
  const nextKey = useRef(0);
  const newKey = (): string => `range-${nextKey.current++}`;
  const [rows, setRows] = useState<RangeRowState[]>(() => toRowStates(list.data, kind, newKey));
  const [dirty, setDirty] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const current = list.current_number;
  const errors = checkRanges(rows, kind, current);
  const columns = 2 + VALUE_COLUMNS[kind] + (canWrite ? 1 : 0);

  function edit(next: RangeRowState[]): void {
    setRows(next);
    setDirty(true);
    setServerError(null);
  }

  async function submit(): Promise<void> {
    try {
      await save.mutateAsync({ series, kind, rows: toRangePayload(rows, kind, current) });
      addToast({ title: `${title} saved`, description: 'Documents in these ranges print with them.', variant: 'success' });
    } catch (error) {
      setServerError(friendlyError(error));
      addToast({ title: `Could not save ${title}`, description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-2">
      <Table aria-label={title}>
        <TableHeader>
          <TableRow>
            <TableHead>From {numberLabel}</TableHead>
            <TableHead>To {numberLabel}</TableHead>
            <ValueHeaders kind={kind} />
            {canWrite && <TableHead className="text-right">Delete</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns} className="text-sm text-muted-foreground">No ranges: documents print without one.</TableCell>
            </TableRow>
          )}
          {rows.map((row, index) => (
            <RangeRow
              key={row.key}
              kind={kind}
              row={row}
              index={index + 1}
              numberLabel={numberLabel}
              current={current}
              canWrite={canWrite}
              columns={columns}
              error={errors[row.key]}
              change={(patch) => edit(rows.map((item) => (item.key === row.key ? { ...item, ...patch } : item)))}
              remove={() => edit(rows.filter((item) => item.key !== row.key))}
            />
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">
        Last number issued: {current}. A range starting at or below it is in use: only its end can be set. A blank To
        means open-ended.
      </p>
      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
      {canWrite && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => edit([...rows, blankRow(newKey())])}>
            <Plus className="mr-2 h-4 w-4" />
            Add row
          </Button>
          <Button type="button" size="sm" onClick={() => void submit()} disabled={!dirty || Object.keys(errors).length > 0 || save.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}

/** A number-range table of Customize Invoice (INC-40) for one series and kind. */
export function RangeTable(props: RangeTableProps): ReactNode {
  const query = useDocumentRanges(props.series, props.kind);
  let body: ReactNode;
  if (isNotDeployed(query.error)) body = <p className="text-sm text-muted-foreground">Not available yet on this server.</p>;
  else if (query.error) body = <p role="alert" className="text-sm text-destructive">{friendlyError(query.error)}</p>;
  else if (!query.data) body = <p className="text-sm text-muted-foreground">Loading…</p>;
  else body = <RangeEditor key={query.dataUpdatedAt} {...props} list={query.data} />;
  return (
    <section aria-label={props.title} className="space-y-2">
      <h3 className="text-sm font-semibold">{props.title}</h3>
      {body}
    </section>
  );
}
