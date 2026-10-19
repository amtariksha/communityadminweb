'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useUnits } from '@/hooks/use-units';
import { downloadPreviewPdf, useRulePreview, type PreviewParams } from '@/hooks/use-billing-rules';
import { friendlyError } from '@/lib/api-error';
import { saveBlob } from '@/lib/download';
import { PreviewResult } from './preview-result';

export interface PreviewInvoiceFormProps {
  mode: FormMode;
  open?: boolean;
  onClose: () => void;
  category: { id: string; name: string };
  /** Default invoice date: the next scheduled run (else the 1st of next month). */
  defaultDate: string;
  defaultGraceDays: number;
}

/** Setup › Auto Invoicing › Preview Invoice (INC-S4): what a unit of this type would be billed. */
export function PreviewInvoiceForm(props: PreviewInvoiceFormProps): ReactNode {
  const { addToast } = useToast();
  const units = useUnits({ limit: 1000 });
  const ofType = useMemo(
    () => (units.data?.data ?? []).filter((unit) => unit.billing_category_id === props.category.id),
    [units.data, props.category.id],
  );
  const [unitId, setUnitId] = useState('');
  const [date, setDate] = useState(props.defaultDate);
  const [grace, setGrace] = useState(String(props.defaultGraceDays));
  const [params, setParams] = useState<PreviewParams | null>(null);
  const preview = useRulePreview(params);
  const valid = unitId !== '' && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{1,3}$/.test(grace) && Number(grace) <= 365;

  async function download(): Promise<void> {
    if (!params) return;
    try {
      saveBlob(await downloadPreviewPdf(params), `preview-${params.invoice_date}.pdf`);
    } catch (error) {
      addToast({ title: 'Could not make the PDF preview', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <FormFrame
      mode={props.mode}
      open={props.open}
      onClose={props.onClose}
      onSave={() => valid && setParams({ unit_id: unitId, invoice_date: date, grace_days: Number(grace) })}
      saveLabel="Preview"
      title="Preview Invoice"
      description={`Unit type: ${props.category.name}`}
      dialogClassName="sm:max-w-3xl"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="preview-unit">Unit</Label>
          <Select id="preview-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">{ofType.length === 0 ? 'No units of this type' : 'Pick a unit'}</option>
            {ofType.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.block ? `${unit.block}-` : ''}
                {unit.unit_number}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="preview-date">Invoice date</Label>
          <Input id="preview-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="preview-grace">Grace days</Label>
          <Input id="preview-grace" type="number" min={0} max={365} value={grace} onChange={(e) => setGrace(e.target.value)} />
        </div>
      </div>
      {preview.isError && <p role="alert" className="text-sm text-destructive">{friendlyError(preview.error)}</p>}
      {preview.data && (
        <>
          <PreviewResult preview={preview.data} />
          <Button type="button" variant="outline" onClick={() => void download()}>
            Download PDF preview
          </Button>
        </>
      )}
    </FormFrame>
  );
}
