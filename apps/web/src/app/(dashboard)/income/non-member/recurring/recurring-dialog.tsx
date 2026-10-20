'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useIncomeAccounts } from '@/hooks/use-income-accounts';
import { useCreateRecurringInvoice, type RecurringFrequency } from '@/hooks/use-recurring-invoices';
import { friendlyError } from '@/lib/api-error';
import { isRouteMissing } from '@/lib/not-deployed';
import { emptyLine, emptyRecurringForm, FREQUENCY_LABELS, GST_RATES, MAX_LINES, recurringErrors, toRecurringPayload, type LineForm, type RecurringForm } from './recurring-form';

function LineRow({ line, index, errors, accounts, onChange, onRemove }: {
  line: LineForm;
  index: number;
  errors: Record<string, string>;
  accounts: ReadonlyArray<{ id: string; name: string }>;
  onChange: (patch: Partial<LineForm>) => void;
  onRemove?: () => void;
}): ReactNode {
  return (
    <div className="grid items-start gap-2 sm:grid-cols-[2fr_1fr_6rem_2fr_auto]">
      <div>
        <Input aria-label={`Line ${index + 1} description`} placeholder="Description" maxLength={500} value={line.description} onChange={(e) => onChange({ description: e.target.value })} />
        <FormFieldError message={errors[`line${index}.description`]} />
      </div>
      <div>
        <Input aria-label={`Line ${index + 1} amount`} placeholder="Amount" inputMode="decimal" value={line.amount} onChange={(e) => onChange({ amount: e.target.value })} />
        <FormFieldError message={errors[`line${index}.amount`]} />
      </div>
      <Select aria-label={`Line ${index + 1} GST`} value={line.gstRate} onChange={(e) => onChange({ gstRate: e.target.value })}>
        {GST_RATES.map((rate) => (
          <option key={rate} value={rate}>{`GST ${rate}%`}</option>
        ))}
      </Select>
      <Select aria-label={`Line ${index + 1} account`} value={line.accountId} onChange={(e) => onChange({ accountId: e.target.value })}>
        <option value="">Other income (default)</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>{account.name}</option>
        ))}
      </Select>
      {onRemove ? <Button type="button" variant="ghost" size="sm" onClick={onRemove}>Remove</Button> : <span />}
    </div>
  );
}

/** Set up a recurring invoice for a payer (INC-66): raised by the daily billing job from the start date. */
export function RecurringDialog({ customerId, today, onClose }: { customerId: string; today: string; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const create = useCreateRecurringInvoice();
  const accounts = (useIncomeAccounts().data ?? []).filter((account) => account.is_active && account.income_scope !== 'member');
  const [form, setForm] = useState<RecurringForm>(() => emptyRecurringForm(today));
  const [submitted, setSubmitted] = useState(false);
  const errors = recurringErrors(form, today);
  const shown = submitted ? errors : {};
  const set = (patch: Partial<RecurringForm>) => setForm((current) => ({ ...current, ...patch }));
  const setLine = (index: number, patch: Partial<LineForm>) => set({ lines: form.lines.map((line, at) => (at === index ? { ...line, ...patch } : line)) });

  function save(): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    create.mutate(toRecurringPayload(customerId, form), {
      onSuccess: () => {
        addToast({ title: 'Recurring invoice set up', variant: 'success' });
        onClose();
      },
      onError: (error) => {
        const description = isRouteMissing(error) ? 'Recurring invoices are not available yet on this server.' : friendlyError(error);
        addToast({ title: 'Could not set it up', description, variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Recurring invoice</DialogTitle>
          <DialogDescription>Raised for this payer by the daily billing job on each date from the start; drafts unless Post is ticked.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {form.lines.map((line, index) => (
            <LineRow
              key={index}
              line={line}
              index={index}
              errors={shown}
              accounts={accounts}
              onChange={(patch) => setLine(index, patch)}
              onRemove={form.lines.length > 1 ? () => set({ lines: form.lines.filter((_, at) => at !== index) }) : undefined}
            />
          ))}
          {form.lines.length < MAX_LINES && (
            <Button type="button" variant="outline" size="sm" onClick={() => set({ lines: [...form.lines, emptyLine()] })}>Add line</Button>
          )}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="recurring-frequency">Frequency</Label>
              <Select id="recurring-frequency" value={form.frequency} onChange={(e) => set({ frequency: e.target.value as RecurringFrequency })}>
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="recurring-start">Start date</Label>
              <Input id="recurring-start" type="date" min={today} value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
              <FormFieldError message={shown.startDate} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="recurring-end">End date (optional)</Label>
              <Input id="recurring-end" type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />
              <FormFieldError message={shown.endDate} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="recurring-due">Due in (days)</Label>
              <Input id="recurring-due" inputMode="numeric" placeholder="Society default" value={form.dueDays} onChange={(e) => set({ dueDays: e.target.value })} />
              <FormFieldError message={shown.dueDays} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.autoPost} onChange={(e) => set({ autoPost: e.target.checked })} />
            Post each invoice as soon as it is raised
          </label>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
          <Button type="button" onClick={save} disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
