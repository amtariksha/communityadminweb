import { describe, expect, it } from 'vitest';
import { toTsv } from '@/components/data-table/table-text';
import type { Meter } from '@/hooks/use-utilities';
import { formatDate } from '@/lib/utils';
import { lastReadingText, METER_TEXT_COLUMNS } from './meter-columns';

const meter = (overrides: Partial<Meter>): Meter => ({
  id: 'm1',
  tenant_id: 't1',
  unit_id: 'u1',
  is_common: false,
  meter_type: 'water',
  meter_number: 'W-101',
  is_active: true,
  created_at: '2026-04-01',
  unit_number: 'A-101',
  ...overrides,
});

describe('Meters list: Last Reading (UTIL-05)', () => {
  it('shows the latest reading and its date', () => {
    expect(lastReadingText(meter({ last_reading_value: '12400.00', last_reading_date: '2026-09-30' }))).toBe(
      `12,400 on ${formatDate('2026-09-30')}`,
    );
  });

  it('shows a dash for a meter never read, and for an API that does not send it yet', () => {
    expect(lastReadingText(meter({ last_reading_value: null, last_reading_date: null }))).toBe('—');
    expect(lastReadingText(meter({}))).toBe('—');
  });

  it('copies the column with the rest of the row', () => {
    const text = toTsv(METER_TEXT_COLUMNS, [meter({ is_common: true, unit_id: null, unit_number: undefined })]);
    expect(text.split('\n')[0]).toBe('Type\tMeter Number\tUnit\tStatus\tLast Reading\tCreated');
    expect(text.split('\n')[1]).toMatch(/^Water\tW-101\tCommon\tActive\t—\t/);
  });
});
