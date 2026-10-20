'use client';

import { useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormFrame } from '@/components/form-page';
import { useToast } from '@/components/ui/toast';
import { batchSummary } from '@/hooks/use-utility-batch';
import { useBatchGrid, useBatchPost, type BatchPostResult, type BatchRowOutcome } from '@/hooks/use-utility-batch-post';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { meterTypeLabel } from '../../utility-ui';
import { batchRequest, BatchSettingsFields, periodProblem, useBatchSettings, type BatchSettings } from '../batch-settings';
import { BatchGrid } from './batch-grid';
import { blankEntry, outcomesByMeter, prepareRows, type GridEntry } from './batch-rows';

function useEntries(defaultDate: string) {
  const [entries, setEntries] = useState<Record<string, GridEntry>>({});
  const change = (meterId: string, patch: Partial<GridEntry>) =>
    setEntries((current) => ({ ...current, [meterId]: { ...(current[meterId] ?? blankEntry(defaultDate)), ...patch } }));
  return { entries, change, reset: () => setEntries({}) };
}

function postedSummary(result: BatchPostResult): string {
  const invoices = result.invoices ? ` ${batchSummary(result.invoices)}` : '';
  return `${result.readings_recorded} readings and ${result.bills_created} bills recorded.${invoices}`;
}

/**
 * Utility Tracker › Bulk Posting › Invoices in Batch (UTIL-15): the block's
 * tracked meters of one type; type the closing readings (and the opening
 * where Memorize Units is off), Preview to see consumption and amount per
 * row with nothing stored, then Post: readings, bills and invoices in one
 * go, a bad row reported while the others post.
 */
export function BatchContent(): ReactNode {
  const router = useRouter();
  const params = useSearchParams();
  const block = params?.get('block') ?? null;
  const [settings, setSettings] = useBatchSettings(params?.get('meter_type') ?? null);
  const problem = periodProblem(settings);
  const grid = useBatchGrid(problem ? null : { meter_type: settings.meter_type, period_from: settings.period_from, period_to: settings.period_to }, block);
  const { entries, change, reset } = useEntries(settings.period_to);
  const [outcomes, setOutcomes] = useState<Record<string, BatchRowOutcome>>({});
  const [invalid, setInvalid] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const post = useBatchPost();
  const { addToast } = useToast();
  const memorize = grid.data?.memorize ?? true;

  function update(patch: Partial<BatchSettings>): void {
    setSettings(patch);
    setOutcomes({});
    setSummary(null);
    if (patch.meter_type) reset();
  }

  async function send(dryRun: boolean): Promise<void> {
    if (!grid.data) return;
    const prepared = prepareRows(grid.data.meters, entries, memorize);
    setInvalid(prepared.invalid);
    if (prepared.rows.length === 0) return setSummary('Type at least one Closing Reading.');
    try {
      const result = await post.mutateAsync({ ...batchRequest(settings), dry_run: dryRun, rows: prepared.rows });
      setOutcomes(outcomesByMeter(prepared.meterIds, result.rows));
      const bad = result.rows.filter((row) => row.errors.length > 0).length;
      setSummary(dryRun ? `Preview: ${result.rows.length - bad} ready, ${bad} with errors. Nothing has been saved.` : postedSummary(result));
      if (!dryRun) addToast({ title: 'Utility readings posted', description: postedSummary(result), variant: 'success' });
    } catch (error) {
      setSummary(isNotDeployed(error) ? 'Invoices in Batch is not available yet on this server.' : friendlyError(error));
    }
  }

  const back = block ? `/utilities/bulk-posting?block=${encodeURIComponent(block)}` : '/utilities/bulk-posting';
  return (
    <FormFrame
      mode="page"
      title={`${meterTypeLabel(settings.meter_type)} readings to invoices — ${block ?? 'All Blocks'}`}
      description="Tracked units of the block with an active meter of this type."
      onClose={() => router.push(back)}
      onSave={() => void send(false)}
      secondaryAction={{ label: 'Preview', onClick: () => void send(true) }}
      saving={post.isPending}
      saveDisabled={!grid.data || grid.data.memorize === null}
      saveLabel="Post"
      savingLabel="Working…"
    >
      <BatchSettingsFields settings={settings} onChange={update} />
      {problem && <p className="text-sm text-destructive">{problem}</p>}
      {grid.data === null && <p className="text-sm text-muted-foreground">Invoices in Batch is not available yet on this server.</p>}
      {grid.data?.tariff_error && <p className="text-sm text-destructive">{grid.data.tariff_error}</p>}
      {grid.data && grid.data.meters.length === 0 && <p className="text-sm text-muted-foreground">No tracked unit of this block has an active {settings.meter_type} meter.</p>}
      {grid.data && grid.data.meters.length > 0 && (
        <BatchGrid meters={grid.data.meters} entries={entries} outcomes={outcomes} invalid={invalid} memorize={memorize} defaultDate={settings.period_to} disabled={post.isPending} onChange={change} />
      )}
      {summary && (
        <p role="status" className="text-sm">
          {summary}
        </p>
      )}
    </FormFrame>
  );
}
