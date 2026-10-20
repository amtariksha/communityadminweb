'use client';

import { useState, type ReactNode } from 'react';
import { useCommunityForms } from '@/hooks/use-community-forms';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { UserSearchSelect } from '@/components/ui/user-search-select';
import { useAccountGroups } from '@/hooks/use-ledger';
import { useUnitBlocks } from '@/hooks/use-unit-blocks';
import { UNIT_PICKER_LIMIT, useUnits } from '@/hooks/use-units';
import { useVendors } from '@/hooks/use-vendors';
import { usePolls } from '@/hooks/use-voting';
import { useAmenities } from '@/hooks/use-amenities';
import type { UserSearchHit } from '@/hooks/use-user-search';
import type { CatalogueParam } from '@/hooks/use-reports';
import { useHelpdeskCategories } from '@/hooks/use-helpdesk';
import { useAssetCategories } from '@/hooks/use-asset-categories';
import { useInventoryCategories } from '@/hooks/use-inventory-setup';
import { ANY, CUSTOM_RANGE, financialYearOptions, type ParamValue, type RangeValue } from './report-param-state';

// The unit and vendor parameters offer every unit and vendor, not the first 100
// (GET /units allows up to 1,000; GET /vendors has no cap and is held to the same).
const VENDOR_PICKER_LIMIT = 1000;

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
        <Options options={param.required ? RANGE_PRESETS : [{ value: ANY, label: 'Any date' }, ...RANGE_PRESETS]} />
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
  const units = useUnits({ limit: UNIT_PICKER_LIMIT });
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
  const vendors = useVendors({ limit: VENDOR_PICKER_LIMIT });
  const options = [{ value: '', label: 'Choose a vendor' }, ...(vendors.data?.data ?? []).map((vendor) => ({ value: vendor.id, label: vendor.name }))];
  return (
    <Select id={fieldId(param)} aria-label={param.label} value={String(value)} onChange={(event) => onChange(event.target.value)}>
      <Options options={options} />
    </Select>
  );
}

function UserField({ value, onChange }: FieldProps): ReactNode {
  const [picked, setPicked] = useState<UserSearchHit | null>(null);
  const shown = picked && picked.id === value ? picked : null;
  return (
    <UserSearchSelect
      value={shown}
      scope="tenant"
      placeholder="Search by name or phone"
      noMatchHint="No one in this society matches."
      onChange={(user) => {
        setPicked(user);
        onChange(user?.id ?? '');
      }}
    />
  );
}

function PollField({ param, value, onChange }: FieldProps): ReactNode {
  const polls = usePolls();
  const options = [{ value: '', label: 'Choose a poll' }, ...(polls.data?.data ?? []).map((poll) => ({ value: poll.id, label: poll.title }))];
  return (
    <Select id={fieldId(param)} aria-label={param.label} value={String(value)} onChange={(event) => onChange(event.target.value)}>
      <Options options={options} />
    </Select>
  );
}

function AmenityField({ param, value, onChange }: FieldProps): ReactNode {
  const amenities = useAmenities();
  const first = param.required ? 'Choose an amenity' : 'All amenities';
  const options = [{ value: '', label: first }, ...(amenities.data?.data ?? []).map((amenity) => ({ value: amenity.id, label: amenity.name }))];
  return (
    <Select id={fieldId(param)} aria-label={param.label} value={String(value)} onChange={(event) => onChange(event.target.value)}>
      <Options options={options} />
    </Select>
  );
}

function CommunityFormField({ param, value, onChange }: FieldProps): ReactNode {
  const forms = useCommunityForms({ limit: 100 });
  const options = [{ value: '', label: 'Choose a form' }, ...(forms.data?.data ?? []).map((form) => ({ value: form.id, label: form.name }))];
  return (
    <Select id={fieldId(param)} aria-label={param.label} value={String(value)} onChange={(event) => onChange(event.target.value)}>
      <Options options={options} />
    </Select>
  );
}

function ChoiceField({ param, value, onChange, options }: FieldProps & { options: ReadonlyArray<{ value: string; label: string }> }): ReactNode {
  // An optional choice can be left on All (no filter).
  const shown = param.required || param.type !== 'select' ? options : [{ value: ANY, label: 'All' }, ...options];
  return (
    <Select id={fieldId(param)} aria-label={param.label} value={String(value)} onChange={(event) => onChange(event.target.value)}>
      <Options options={shown} />
    </Select>
  );
}

function TicketCategoryField(props: FieldProps): ReactNode {
  const categories = useHelpdeskCategories();
  const options = (categories.data ?? []).map((category) => ({ value: category.id, label: category.name }));
  return <ChoiceField {...props} options={options} param={{ ...props.param, type: 'select' }} />;
}

function AssetCategoryField(props: FieldProps): ReactNode {
  const categories = useAssetCategories();
  const options = (categories.data ?? []).map((category) => ({ value: category.id, label: category.name }));
  return <ChoiceField {...props} options={options} param={{ ...props.param, type: 'select' }} />;
}

function InventoryCategoryField(props: FieldProps): ReactNode {
  const categories = useInventoryCategories();
  const options = (categories.data ?? []).map((category) => ({ value: category.id, label: category.name }));
  return <ChoiceField {...props} options={options} param={{ ...props.param, type: 'select' }} />;
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
    case 'user':
      return <UserField {...props} />;
    case 'poll':
      return <PollField {...props} />;
    case 'amenity':
      return <AmenityField {...props} />;
    case 'community_form':
      return <CommunityFormField {...props} />;
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
    case 'ticket_category':
      return <TicketCategoryField {...props} />;
    case 'asset_category':
      return <AssetCategoryField {...props} />;
    case 'inventory_category':
      return <InventoryCategoryField {...props} />;
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
