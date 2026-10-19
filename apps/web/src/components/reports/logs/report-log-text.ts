import type { ReportLogRow } from '@/hooks/use-reports';

/** How a Show Logs line reads (REP-S5). */

export const ACTION_LABELS: Readonly<Record<ReportLogRow['action'], string>> = {
  viewed: 'Viewed',
  exported: 'Exported',
  scheduled_run: 'Scheduled run',
  published: 'Published',
  schedule_created: 'Schedule created',
  schedule_changed: 'Schedule changed',
  publication_retired: 'Publication retired',
};

const FORMATS: Readonly<Record<string, string>> = { json: 'Screen', csv: 'CSV', xlsx: 'Excel', pdf: 'PDF' };

export function formatText(format: string | null): string {
  return format ? (FORMATS[format] ?? format) : '—';
}

function optionText(value: unknown): string {
  if (value && typeof value === 'object' && 'label' in value) return String((value as { label: unknown }).label);
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

const OPTION_LABELS: Readonly<Record<string, string>> = { as_of: 'As of', period: 'Period', block: 'Block', frequency: 'Frequency' };

/** "Period: Sep 2026 · Block: A" (resolved options carry a label). */
export function optionsText(options: Record<string, unknown> | null): string {
  if (!options) return '—';
  const parts = Object.entries(options)
    .filter(([key, value]) => value !== null && value !== undefined && value !== '' && key !== 'report_key' && key !== 'params')
    .map(([key, value]) => `${OPTION_LABELS[key] ?? key}: ${optionText(value)}`);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function resultText(row: Pick<ReportLogRow, 'result' | 'error_code'>): string {
  if (row.result === 'failed') return `Failed${row.error_code ? ` (${row.error_code})` : ''}`;
  if (row.result === 'running') return 'Running';
  return 'Done';
}
