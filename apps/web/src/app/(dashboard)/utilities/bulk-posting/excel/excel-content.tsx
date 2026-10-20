'use client';

import { type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ImportFlow } from '@/components/import/import-flow';
import { ImportLog } from '@/components/import/import-log';
import { meterTypeLabel } from '../../utility-ui';
import { batchOptions, BatchSettingsFields, periodProblem, useBatchSettings } from '../batch-settings';

const READINGS_TARGET = { endpoint: '/utilities/imports', type: 'utility_readings' } as const;

const PREVIEW_COLUMNS = [
  { key: 'meter_number', label: 'Meter No' },
  { key: 'unit_number', label: 'Unit No' },
  { key: 'reading_date', label: 'Reading Date' },
  { key: 'closing_reading', label: 'Closing Reading' },
  { key: 'opening_reading', label: 'Opening Reading' },
] as const;

/**
 * Utility Tracker › Bulk Posting › Invoices using Excel (UTIL-16): the meter
 * reader's sheet. Each row is checked as a row of Invoices in Batch; the
 * good rows post readings, bills and invoices; the same sheet cannot be
 * posted twice.
 */
export function ExcelContent(): ReactNode {
  const router = useRouter();
  const params = useSearchParams();
  const block = params?.get('block') ?? null;
  const [settings, setSettings] = useBatchSettings(params?.get('meter_type') ?? null);
  const problem = periodProblem(settings);
  const back = block ? `/utilities/bulk-posting?block=${encodeURIComponent(block)}` : '/utilities/bulk-posting';
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">{meterTypeLabel(settings.meter_type)} readings to invoices — Invoices using Excel</h1>
        <Button type="button" variant="outline" onClick={() => router.push(back)}>
          Close
        </Button>
      </div>
      <ImportFlow
        target={READINGS_TARGET}
        title="Upload meter readings"
        description="One row per meter: Meter No, Reading Date and Closing Reading (the Opening Reading only where Memorize Units is off). Rows with errors are listed and left out; the others post readings, bills and invoices."
        columns={PREVIEW_COLUMNS}
        options={batchOptions(settings)}
        applyLabel="Post"
        allowed={problem === null}
      >
        <BatchSettingsFields settings={settings} onChange={setSettings} />
        {problem && <p className="text-sm text-destructive">{problem}</p>}
      </ImportFlow>
      <ImportLog endpoint={READINGS_TARGET.endpoint} type={READINGS_TARGET.type} labels={{ utility_readings: 'Meter readings' }} />
    </div>
  );
}
