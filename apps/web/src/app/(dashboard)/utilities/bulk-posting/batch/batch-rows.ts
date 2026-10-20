import type { BatchGridMeter, BatchPostRowInput, BatchRowOutcome } from '@/hooks/use-utility-batch-post';

/** What the committee types for one meter in the Invoices in Batch grid. */
export interface GridEntry {
  opening: string;
  closing: string;
  date: string;
  comment: string;
}

export const blankEntry = (date: string): GridEntry => ({ opening: '', closing: '', date, comment: '' });

const number = (text: string): number | undefined => {
  const cleaned = text.replace(/,/g, '').trim();
  if (cleaned === '' || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  return Number(cleaned);
};

export interface PreparedRows {
  rows: BatchPostRowInput[];
  /** The meter of each row sent, in order (outcomes come back by position). */
  meterIds: string[];
  /** Typed values that are not readings, by meter. */
  invalid: Record<string, string>;
}

/**
 * The rows to send: every meter with a Closing Reading typed. The opening
 * goes only when the rule does not memorize readings (UTIL-13). A value
 * that is not a reading is marked on its row and the row is not sent.
 */
export function prepareRows(meters: readonly BatchGridMeter[], entries: Readonly<Record<string, GridEntry>>, memorize: boolean): PreparedRows {
  const prepared: PreparedRows = { rows: [], meterIds: [], invalid: {} };
  for (const meter of meters) {
    const entry = entries[meter.meter_id];
    if (!entry || entry.closing.trim() === '') continue;
    const closing = number(entry.closing);
    const opening = memorize ? undefined : number(entry.opening);
    if (closing === undefined) prepared.invalid[meter.meter_id] = 'Closing Reading is not a number (at most two decimals)';
    else if (!memorize && entry.opening.trim() !== '' && opening === undefined) prepared.invalid[meter.meter_id] = 'Opening Reading is not a number (at most two decimals)';
    if (prepared.invalid[meter.meter_id] || closing === undefined) continue;
    prepared.rows.push({
      meter_id: meter.meter_id,
      closing_reading: closing,
      reading_date: entry.date,
      ...(opening !== undefined ? { opening_reading: opening } : {}),
      ...(entry.comment.trim() ? { comment: entry.comment.trim() } : {}),
    });
    prepared.meterIds.push(meter.meter_id);
  }
  return prepared;
}

/** The server's answer per row, keyed by meter. */
export function outcomesByMeter(meterIds: readonly string[], outcomes: readonly BatchRowOutcome[]): Record<string, BatchRowOutcome> {
  const byMeter: Record<string, BatchRowOutcome> = {};
  for (const outcome of outcomes) {
    const meterId = meterIds[outcome.row - 1];
    if (meterId) byMeter[meterId] = outcome;
  }
  return byMeter;
}
