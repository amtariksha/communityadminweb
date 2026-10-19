import type { TextColumn } from '@/components/data-table/table-text';
import type { Meter } from '@/hooks/use-utilities';
import { formatDate } from '@/lib/utils';
import { meterTypeLabel } from './utility-ui';

/** "12,400 on 30 Sep 2026", or a dash for a meter never read (UTIL-05). */
export function lastReadingText(meter: Pick<Meter, 'last_reading_value' | 'last_reading_date'>): string {
  if (meter.last_reading_value == null) return '—';
  const value = Number(meter.last_reading_value).toLocaleString('en-IN');
  return meter.last_reading_date ? `${value} on ${formatDate(meter.last_reading_date)}` : value;
}

export function meterUnitText(meter: Pick<Meter, 'is_common' | 'unit_number' | 'unit_id'>): string {
  if (meter.is_common) return 'Common';
  return meter.unit_number ?? meter.unit_id ?? '—';
}

/** Copy and Print of the visible Meters list, in the order on screen. */
export const METER_TEXT_COLUMNS: readonly TextColumn<Meter>[] = [
  { header: 'Type', text: (meter) => meterTypeLabel(meter.meter_type) },
  { header: 'Meter Number', text: (meter) => meter.meter_number },
  { header: 'Unit', text: meterUnitText },
  { header: 'Status', text: (meter) => (meter.is_active ? 'Active' : 'Inactive') },
  { header: 'Last Reading', text: lastReadingText },
  { header: 'Created', text: (meter) => formatDate(meter.created_at) },
];
