'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { CatalogueParam, CatalogueRow, ReportSchedule, ScheduleInput } from '@/hooks/use-reports';
import { todayIST } from '@/lib/date';
import { ReportParamField } from '../run/report-param-fields';
import {
  SCHEDULE_ROLES,
  initialForm,
  otherParams,
  periodParams,
  scheduleBody,
  type ScheduleFormValues,
} from './schedule-form-state';

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PRESETS = [
  { value: 'current_month', label: 'Current month' },
  { value: 'previous_month', label: 'Previous month' },
  { value: 'two_months_back', label: 'Two months back' },
  { value: 'quarter_1', label: 'Last completed quarter' },
  { value: 'current_fy', label: 'Current financial year' },
  { value: 'previous_fy', label: 'Previous financial year' },
];
const AS_OF = [
  { value: 'as_of_today', label: 'The run date' },
  { value: 'previous_month', label: 'End of the previous month' },
  { value: 'quarter_1', label: 'End of the last completed quarter' },
  { value: 'previous_fy', label: 'End of the previous financial year' },
];
const YEARS = [
  { value: 'current_fy', label: 'Current financial year' },
  { value: 'previous_fy', label: 'Previous financial year' },
];
const TIMES = Array.from({ length: 96 }, (_, index) => {
  const time = `${String(Math.floor(index / 4)).padStart(2, '0')}:${String((index % 4) * 15).padStart(2, '0')}`;
  return { value: time, label: time };
});

function Choice({ id, label, value, options, onChange }: {
  id: string;
  label: string;
  value: string | number;
  options: ReadonlyArray<{ value: string | number; label: string }>;
  onChange: (value: string) => void;
}): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} aria-label={label} value={String(value)} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function periodOptions(param: CatalogueParam): ReadonlyArray<{ value: string; label: string }> {
  if (param.type === 'as_of_date') return AS_OF;
  if (param.type === 'financial_year') return YEARS;
  return param.type === 'period_preset' && param.options ? param.options : PRESETS;
}

function TimingFields({ values, set }: { values: ScheduleFormValues; set: (patch: Partial<ScheduleFormValues>) => void }): ReactNode {
  const days = Array.from({ length: 28 }, (_, index) => ({ value: index + 1, label: String(index + 1) }));
  return (
    <div className="flex flex-wrap gap-3">
      <Choice id="schedule-frequency" label="Frequency" value={values.frequency} options={FREQUENCIES} onChange={(value) => set({ frequency: value as ScheduleFormValues['frequency'] })} />
      {values.frequency === 'weekly' && (
        <Choice id="schedule-weekday" label="Day of week" value={values.day_of_week} options={WEEKDAYS.map((day, index) => ({ value: index + 1, label: day }))} onChange={(value) => set({ day_of_week: Number(value) })} />
      )}
      {values.frequency === 'quarterly' && (
        <Choice id="schedule-quarter-month" label="Month of quarter" value={values.month_of_quarter} options={[{ value: 1, label: '1st' }, { value: 2, label: '2nd' }, { value: 3, label: '3rd' }]} onChange={(value) => set({ month_of_quarter: Number(value) })} />
      )}
      {(values.frequency === 'monthly' || values.frequency === 'quarterly') && (
        <Choice id="schedule-day" label="Day of month" value={values.day_of_month} options={days} onChange={(value) => set({ day_of_month: Number(value) })} />
      )}
      <Choice id="schedule-time" label="Time (India)" value={values.time_of_day} options={TIMES} onChange={(value) => set({ time_of_day: value })} />
    </div>
  );
}

function RecipientFields({ values, set }: { values: ScheduleFormValues; set: (patch: Partial<ScheduleFormValues>) => void }): ReactNode {
  const toggle = (role: string): void =>
    set({ recipient_roles: values.recipient_roles.includes(role) ? values.recipient_roles.filter((r) => r !== role) : [...values.recipient_roles, role] });
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Send by e-mail to</legend>
      <div className="flex flex-wrap gap-3">
        {SCHEDULE_ROLES.map((role) => (
          <label key={role.value} className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={values.recipient_roles.includes(role.value)} onChange={() => toggle(role.value)} />
            {role.label}
          </label>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor="schedule-emails">Other e-mail addresses (up to 10)</Label>
        <Input id="schedule-emails" value={values.recipient_emails} placeholder="treasurer@example.com, auditor@example.com" onChange={(event) => set({ recipient_emails: event.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" disabled checked={false} readOnly />
        Post to notice board (comes with publishing)
      </label>
    </fieldset>
  );
}

/** Add or edit one schedule of a report. */
export function ScheduleForm({ row, schedule, busy, error, onSave, onCancel }: {
  row: CatalogueRow;
  schedule?: ReportSchedule;
  busy: boolean;
  error: string | null;
  onSave: (body: Partial<ScheduleInput>) => void;
  onCancel: () => void;
}): ReactNode {
  const today = todayIST();
  const [values, setValues] = useState<ScheduleFormValues>(() => initialForm(row, today, schedule));
  const [problem, setProblem] = useState<string | null>(null);
  const set = (patch: Partial<ScheduleFormValues>): void => setValues((current) => ({ ...current, ...patch }));
  function submit(event: FormEvent): void {
    event.preventDefault();
    const result = scheduleBody(row, values);
    setProblem('error' in result ? result.error : null);
    if ('body' in result) onSave(schedule ? { ...result.body, report_key: undefined } : result.body);
  }
  return (
    <form aria-label="Schedule" onSubmit={submit} className="space-y-3">
      <TimingFields values={values} set={set} />
      <div className="flex flex-wrap gap-3">
        {periodParams(row).map((param) => (
          <Choice key={param.key} id={`schedule-${param.key}`} label={param.label} value={values.periods[param.key]} options={periodOptions(param)} onChange={(value) => set({ periods: { ...values.periods, [param.key]: value } })} />
        ))}
        {otherParams(row).map((param) => (
          <ReportParamField key={param.key} param={param} today={today} value={values.options[param.key]} onChange={(value) => set({ options: { ...values.options, [param.key]: value } })} />
        ))}
        <Choice id="schedule-format" label="Format" value={values.format} options={[{ value: 'pdf', label: 'PDF' }, { value: 'xlsx', label: 'Excel' }, { value: 'csv', label: 'CSV' }]} onChange={(value) => set({ format: value as ScheduleFormValues['format'] })} />
      </div>
      <RecipientFields values={values} set={set} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.is_active} onChange={(event) => set({ is_active: event.target.checked })} />
        Active
      </label>
      {(problem ?? error) && (
        <p role="alert" className="text-sm text-destructive">
          {problem ?? error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Close
        </Button>
      </div>
    </form>
  );
}
