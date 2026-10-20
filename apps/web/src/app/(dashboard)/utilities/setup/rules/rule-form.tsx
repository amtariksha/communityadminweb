'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { Button } from '@/components/ui/button';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useCreateMeterRule, useEndMeterRule, useReviseMeterRule, type MeterRule, type MeterType } from '@/hooks/use-meter-rules';
import { friendlyError } from '@/lib/api-error';
import { METER_TYPES, meterTypeLabel } from '../../utility-ui';
import {
  emptyRuleForm,
  firstRevisionDay,
  formFromRule,
  ruleFormErrors,
  toRuleInput,
  type RuleForm,
  type RuleFormErrors,
} from './rule-form-state';

export interface RuleFormProps {
  mode: FormMode;
  open?: boolean;
  /** Edit = a new version of this rule from a later date. */
  rule?: MeterRule;
  meterType?: MeterType;
  today: string;
  onClose: () => void;
  onSaved: (rule: MeterRule) => void;
}

function SlabTable({ form, set, errors }: { form: RuleForm; set: (patch: Partial<RuleForm>) => void; errors: RuleFormErrors }): ReactNode {
  const change = (index: number, key: 'upto' | 'rate', value: string): void =>
    set({ slabs: form.slabs.map((row, i) => (i === index ? { ...row, [key]: value } : row)) });
  return (
    <table className="w-full text-sm" aria-label="Slabs">
      <thead>
        <tr className="text-left">
          <th className="py-1 font-semibold">Slab</th>
          <th className="py-1 font-semibold">Units (up to)</th>
          <th className="py-1 font-semibold">Rate (₹)</th>
        </tr>
      </thead>
      <tbody>
        {form.slabs.map((row, index) => (
          <tr key={index}>
            <td className="py-1 pr-2">{index + 1}</td>
            <td className="py-1 pr-2">
              <Input aria-label={`Slab ${index + 1} units`} inputMode="decimal" value={row.upto} onChange={(e) => change(index, 'upto', e.target.value)} />
              <FormFieldError message={errors[`slabs.${index}.upto`]} />
            </td>
            <td className="py-1">
              <Input aria-label={`Slab ${index + 1} rate`} inputMode="decimal" value={row.rate} onChange={(e) => change(index, 'rate', e.target.value)} />
              <FormFieldError message={errors[`slabs.${index}.rate`]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RuleFields({ form, set, errors, editing }: { form: RuleForm; set: (patch: Partial<RuleForm>) => void; errors: RuleFormErrors; editing: boolean }): ReactNode {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Create New Metering Rule for</Label>
          <AccountSearchSelect value={form.ledgerAccountId} onChange={(id) => set({ ledgerAccountId: id })} accountType={['income']} placeholder="Search income accounts" />
          <FormFieldError message={errors.ledgerAccountId} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rule-meter-type">Meter type</Label>
          <Select id="rule-meter-type" value={form.meterType} disabled={editing} onChange={(e) => set({ meterType: e.target.value as MeterType })}>
            {METER_TYPES.map((type) => (
              <option key={type} value={type}>{meterTypeLabel(type)}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.memorize} onChange={(e) => set({ memorize: e.target.checked })} />
          Memorize Units (open each period on the last reading)
        </label>
        <label className="flex items-center gap-2" title="Cumulative is meant for piped gas">
          <input type="checkbox" checked={form.cumulative} onChange={(e) => set({ cumulative: e.target.checked })} />
          Use Cumulative Slab (all units at the rate of the slab reached)
        </label>
      </div>
      <SlabTable form={form} set={set} errors={errors} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="rule-minimum">Minimum charge (₹)</Label>
          <Input id="rule-minimum" inputMode="decimal" value={form.minimumCharge} onChange={(e) => set({ minimumCharge: e.target.value })} />
          <FormFieldError message={errors.minimumCharge} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rule-from">Effective from</Label>
          <Input id="rule-from" type="date" value={form.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} />
          <FormFieldError message={errors.effectiveFrom} />
        </div>
      </div>
    </div>
  );
}

function EndRule({ rule, today, onEnded }: { rule: MeterRule; today: string; onEnded: (rule: MeterRule) => void }): ReactNode {
  const { addToast } = useToast();
  const end = useEndMeterRule();
  const [date, setDate] = useState(today);
  return (
    <div className="flex flex-wrap items-end gap-2 border-t pt-3">
      <div className="space-y-1">
        <Label htmlFor="rule-end">End this rule on</Label>
        <Input id="rule-end" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={end.isPending || !date}
        onClick={() =>
          end.mutate(
            { id: rule.id, effective_to: date },
            {
              onSuccess: (ended) => onEnded(ended),
              onError: (error) => addToast({ title: 'Could not end the rule', description: friendlyError(error), variant: 'destructive' }),
            },
          )
        }
      >
        End the rule
      </Button>
    </div>
  );
}

/** UTIL-S2 — Add Meter Rule / Edit meter rule: a page in classic, a dialog in standard (SB-07). */
export function MeterRuleForm({ mode, open, rule, meterType = 'water', today, onClose, onSaved }: RuleFormProps): ReactNode {
  const { addToast } = useToast();
  const create = useCreateMeterRule();
  const revise = useReviseMeterRule();
  const [form, setForm] = useState<RuleForm>(() => (rule ? formFromRule(rule, firstRevisionDay(rule, today)) : emptyRuleForm(meterType, today)));
  const [submitted, setSubmitted] = useState(false);
  const errors = useMemo(() => ruleFormErrors(form, rule?.effective_from), [form, rule]);
  const set = (patch: Partial<RuleForm>): void => setForm((current) => ({ ...current, ...patch }));
  const saving = create.isPending || revise.isPending;

  function save(): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    const handlers = {
      onSuccess: (saved: MeterRule) => {
        addToast({ title: 'Meter rule saved', description: `${meterTypeLabel(saved.meter_type)} from ${saved.effective_from}.`, variant: 'success' });
        onSaved(saved);
      },
      onError: (error: unknown) => addToast({ title: 'Could not save the meter rule', description: friendlyError(error), variant: 'destructive' }),
    };
    if (rule) revise.mutate({ id: rule.id, ...toRuleInput(form) }, handlers);
    else create.mutate({ meter_type: form.meterType, ...toRuleInput(form) }, handlers);
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title={rule ? `Edit ${meterTypeLabel(rule.meter_type)} meter rule` : 'Add Meter Rule'}
      description={rule ? 'Saving starts a new version from the date given; bills already calculated keep their amounts.' : undefined}
      onClose={onClose}
      onSave={save}
      saving={saving}
      dialogClassName="max-w-2xl"
    >
      <RuleFields form={form} set={set} errors={submitted ? errors : {}} editing={rule !== undefined} />
      {rule && <EndRule rule={rule} today={today} onEnded={onSaved} />}
    </FormFrame>
  );
}
