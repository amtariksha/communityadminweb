'use client';

import { type ReactNode } from 'react';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { useAccountGroups } from '@/hooks/use-ledger';
import { useUnitBlocks } from '@/hooks/use-unit-blocks';
import { useUnits } from '@/hooks/use-units';
import { useVendors } from '@/hooks/use-vendors';
import type { CatalogueParam } from '@/hooks/use-reports';
import { CUSTOM_RANGE, financialYearOptions, type ParamValue, type RangeValue } from './report-param-state';

/** One widget per parameter type (REP-S2). */

interface FieldProps {
  param: CatalogueParam;
  value: ParamValue;
  onChange: (value: ParamValue) => void;
  today: string;
}

type AccountKind = 'asset' | 'liability' | 'income' | 'expense' | 'equity';

const RANGE_PRESETS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'current_month', label: 'Current month' },
  { value: 'previous_month', label: 'Previous month' },
  { value: 'two_months_back', label: 'Two months back' },
  { value: 'quarter_1', label: 'Last completed quarter' },
  { value: 'quarter_2', label: 'Second last quarter' },
  { value: 'quarter_3', label: 'Third last quarter' },
  { value: 'quarter_4', label: 'Fourth last quarter' },
  { value: 'current_fy', label: 'Current financial year' },
  { value: 'previous_fy', label: 'Previous financial year' },
  { value: CUSTOM_RANGE, label: 'Selected period' },
];

const fieldId = (param: CatalogueParam, part = ''): string => `report-param-${param.key}${part}`;

function Options({ options }: { options: ReadonlyArray<{ value: string; label: string }> }): ReactNode {
  return options.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ));
}

function RangeField({ param, value, onChange }: FieldProps): ReactNode {
  const range = value as RangeValue;
  const set = (patch: Partial<RangeValue>): void => onChange({ ...range, ...patch });
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select id={fieldId(param)} aria-label={param.label} value={range.preset} onChange={(event) => set({ preset: event.target.value })}>
        <Options options={RANGE_PRESETS} />
      </Select>
      {range.preset === CUSTOM_RANGE && (
        <>
          <Input type="date" aria-label={`${param.label} from`} className="w-40" value={range.from} onChange={(event) => set({ from: event.target.value })} />
          <Input type="date" aria-label={`${param.label} to`} className="w-40" value={range.to} onChange={(event) => set({ to: event.target.value })} />
        </>
      )}
    </div>
  );
}

function BlockField({ param, value, onChange }: FieldProps): ReactNode {
  const blocks = useUnitBlocks();
  if (!blocks.data) {
    return <Input id={fieldId(param)} className="w-40" value={String(value)} placeholder="All blocks" onChange={(event) => onChange(event.target.value)} />;
  }
  const options = [{ value: '', label: 'All Blocks' }, ...blocks.data.data.map((block) => ({ value: block.name, label: block.name }))];
  return (
    <Select id={fieldId(param)} aria-label={param.label} value={String(value)} onChange={(event) => onChange(event.target.value)}>
      <Options options={options} />
    </Select>
  );
}

function UnitField({ value, onChange }: FieldProps): ReactNode {
  const units = useUnits({ limit: 100 });
  return <UnitSearchSelect value={String(value)} onChange={onChange} units={units.data?.data ?? []} placeholder="Choose a unit" />;
}

function AccountField({ param, value, onChange }: FieldProps): ReactNode {
  const fallback: AccountKind[] = param.type === 'income_account' ? ['income'] : [];
  const kinds = (param.account_types as AccountKind[] | undefined) ?? fallback;
  return <AccountSearchSelect value={String(value)} onChange={onChange} accountType={kinds} placeholder="Choose an account" />;
}

function AccountGroupField({ param, value, onChange }: FieldProps): ReactNode {
  const groups = useAccountGroups();
  const options = [{ value: '', label: 'Choose a group' }, ...(groups.data ?? []).map((group) => ({ value: group.id, label: group.name }))];
  return (
    <Select id={fieldId(param)} aria-label={param.label} value={String(value)} onChange={(event) => onChange(event.target.value)}>
      <Options options={options} />
    </Select>
  );
}

function VendorField({ param, value, onChange }: FieldProps): ReactNode {
  const vendors = useVendors({ limit: 100 });
  const options = [{ value: '', label: 'Choose a vendor' }, ...(vendors.data?.data ?? []).map((vendor) => ({ value: vendor.id, label: vendor.name }))];
  return (
    <Select id={fieldId(param)} aria-label={param.label} value={String(value)} onChange={(event) => onChange(event.target.value)}>
      <Options options={options} />
    </Select>
  );
}

function ChoiceField({ param, value, onChange, options }: FieldProps & { options: ReadonlyArray<{ value: string; label: string }> }): ReactNode {
  return (
    <Select id={fieldId(param)} aria-label={param.label} value={String(value)} onChange={(event) => onChange(event.target.value)}>
      <Options options={options} />
    </Select>
  );
}

function Widget(props: FieldProps): ReactNode {
  const { param, value, onChange, today } = props;
  switch (param.type) {
    case 'date_range':
      return <RangeField {...props} />;
    case 'date':
    case 'as_of_date':
      return <Input id={fieldId(param)} type="date" className="w-40" value={String(value)} onChange={(event) => onChange(event.target.value)} />;
    case 'period_preset':
    case 'select':
      return <ChoiceField {...props} options={param.options ?? []} />;
    case 'financial_year':
      return <ChoiceField {...props} options={financialYearOptions(today)} />;
    case 'block':
      return <BlockField {...props} />;
    case 'unit':
      return <UnitField {...props} />;
    case 'ledger_account':
    case 'income_account':
      return <AccountField {...props} />;
    case 'account_group':
      return <AccountGroupField {...props} />;
    case 'vendor':
      return <VendorField {...props} />;
    case 'boolean':
      return <input id={fieldId(param)} type="checkbox" className="h-4 w-4" checked={value === true} onChange={(event) => onChange(event.target.checked)} />;
    case 'number':
      return <Input id={fieldId(param)} type="number" className="w-32" value={String(value)} onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))} />;
  }
}

export function ReportParamField(props: FieldProps): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={fieldId(props.param)}>
        {props.param.label}
        {props.param.required ? ' *' : ''}
      </Label>
      <Widget {...props} />
    </div>
  );
}
