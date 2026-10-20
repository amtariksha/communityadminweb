'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { categoryChoices, useAssetCategories, type CategoryChoice } from '@/hooks/use-asset-categories';
import { useCreateAsset, useUpdateAsset, type Asset } from '@/hooks/use-assets';
import { friendlyError } from '@/lib/api-error';
import { LOCATION_PARTS, assetFormError, assetFormValues, assetPayload, type AssetFormValues } from './asset-form-fields';
import { AssetDepreciationFields } from './asset-depreciation-fields';
import { AssetSearchSelect } from './asset-search-select';
import { ASSET_TYPES, CONDITIONS } from './asset-ui';

export interface AssetFormProps {
  mode: FormMode;
  asset?: Asset | null;
  open?: boolean;
  onClose: () => void;
  onSaved: (asset: Asset) => void;
  /** Page only: shown under the title, e.g. the status line and its actions. */
  header?: ReactNode;
}

type Set = (patch: Partial<AssetFormValues>) => void;

function Text(props: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; wide?: boolean }): ReactNode {
  return (
    <div className={props.wide ? 'col-span-2 space-y-2' : 'space-y-2'}>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input id={props.id} type={props.type ?? 'text'} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}

interface CategoryOptions {
  choices: CategoryChoice[];
  byId: boolean;
}

/**
 * The society's active categories (ASSET-16), plus the asset's own when it
 * has been retired; today's fixed types before the API has categories.
 */
function useCategoryOptions(asset?: Asset | null): CategoryOptions {
  const query = useAssetCategories();
  const { choices, byId } = categoryChoices(query.data, ASSET_TYPES);
  const own = asset?.category_id;
  if (byId && own && !choices.some((choice) => choice.value === own)) {
    return { byId, choices: [...choices, { value: own, label: `${asset?.category_name ?? 'Current'} (retired)`, legacyType: null }] };
  }
  return { choices, byId };
}

/** An asset saved before it was linked to a category opens on the category of its fixed type. */
function withLegacyCategory(values: AssetFormValues, options: CategoryOptions, asset?: Asset | null): AssetFormValues {
  if (!options.byId || values.categoryId || !asset) return values;
  const match = options.choices.find((choice) => choice.legacyType === asset.asset_type);
  return match ? { ...values, categoryId: match.value } : values;
}

function CategoryField({ values, set, options }: { values: AssetFormValues; set: Set; options: CategoryOptions }): ReactNode {
  const value = options.byId ? values.categoryId : values.assetType;
  return (
    <div className="space-y-2">
      <Label htmlFor="asset-type">Category *</Label>
      <Select
        id="asset-type"
        value={value}
        onChange={(e) => set(options.byId ? { categoryId: e.target.value } : { assetType: e.target.value })}
      >
        {options.byId && <option value="">Choose a category</option>}
        {options.choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
      </Select>
    </div>
  );
}

/** ASSET-18 — Parent Asset: any asset of the society that is not itself a part (and not this one). */
function ParentField({ values, set, selfId }: { values: AssetFormValues; set: Set; selfId?: string }): ReactNode {
  return (
    <div className="col-span-2 space-y-2">
      <Label htmlFor="asset-parent">Parent Asset (this asset is a part of it)</Label>
      <AssetSearchSelect
        id="asset-parent"
        value={values.parent}
        onChange={(parent) => set({ parent: parent ? { id: parent.id, name: parent.name } : null })}
        exclude={(asset) => asset.id === selfId || Boolean(asset.parent_asset_id)}
        clearLabel="Remove"
      />
    </div>
  );
}

function AssetFields({ values, set, options, selfId }: { values: AssetFormValues; set: Set; options: CategoryOptions; selfId?: string }): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Text id="asset-name" label="Name *" value={values.name} onChange={(name) => set({ name })} wide />
      <CategoryField values={values} set={set} options={options} />
      <Text id="asset-location" label="Location *" value={values.location} onChange={(location) => set({ location })} />
      <Text id="asset-code" label="Asset Code" value={values.assetCode} onChange={(assetCode) => set({ assetCode })} />
      {LOCATION_PARTS.map((part) => (
        <Text key={part.key} id={`asset-${part.key}`} label={part.label} value={values[part.key]} onChange={(value) => set({ [part.key]: value })} />
      ))}
      <Text id="asset-manufacturer" label="Manufacturer" value={values.manufacturer} onChange={(manufacturer) => set({ manufacturer })} />
      <Text id="asset-model" label="Model" value={values.model} onChange={(model) => set({ model })} />
      <Text id="asset-serial" label="Serial Number" value={values.serial} onChange={(serial) => set({ serial })} />
      <Text id="asset-purchase-date" label="Purchase Date" type="date" value={values.purchaseDate} onChange={(purchaseDate) => set({ purchaseDate })} />
      <Text id="asset-cost" label="Purchase Cost" type="number" value={values.purchaseCost} onChange={(purchaseCost) => set({ purchaseCost })} />
      <Text id="asset-warranty" label="Warranty Expiry" type="date" value={values.warrantyExpiry} onChange={(warrantyExpiry) => set({ warrantyExpiry })} />
      <div className="space-y-2">
        <Label htmlFor="asset-condition">Condition</Label>
        <Select id="asset-condition" value={values.condition} onChange={(e) => set({ condition: e.target.value })}>
          {CONDITIONS.map((condition) => <option key={condition.value} value={condition.value}>{condition.label}</option>)}
        </Select>
      </div>
      <ParentField values={values} set={set} selfId={selfId} />
      <AssetDepreciationFields values={values} set={set} />
    </div>
  );
}

/**
 * Add / Edit Asset (ASSET-S6): today's dialog in the standard layout and a
 * page with Save, Save and New and Close in the classic layout (SB-07).
 */
export function AssetForm(props: AssetFormProps): ReactNode {
  const { addToast } = useToast();
  const create = useCreateAsset();
  const update = useUpdateAsset();
  const [typed, setValues] = useState<AssetFormValues>(() => assetFormValues(props.asset));
  const set: Set = (patch) => setValues((current) => ({ ...current, ...patch }));
  const editing = Boolean(props.asset);
  const options = useCategoryOptions(props.asset);
  const values = withLegacyCategory(typed, options, props.asset);

  async function save(andNew: boolean): Promise<void> {
    const problem = assetFormError(values, options.byId);
    if (problem) return addToast({ title: 'Check the asset', description: problem, variant: 'destructive' });
    try {
      const payload = assetPayload(values, options.byId);
      const saved = props.asset
        ? await update.mutateAsync({ id: props.asset.id, ...payload })
        : await create.mutateAsync(payload);
      addToast({ title: editing ? 'Asset updated' : 'Asset created', variant: 'success' });
      if (andNew) setValues(assetFormValues());
      else props.onSaved(saved.data);
    } catch (error) {
      addToast({ title: editing ? 'Failed to update asset' : 'Failed to create asset', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <FormFrame
      mode={props.mode}
      open={props.open}
      title={editing ? 'Edit Asset' : props.mode === 'page' ? 'Add Asset' : 'Create Asset'}
      description={props.mode === 'page' ? props.header : editing ? 'Update asset details' : 'Add a new asset to track'}
      onClose={props.onClose}
      onSave={() => void save(false)}
      onSaveAndNew={props.mode === 'page' && !editing ? () => void save(true) : undefined}
      saving={create.isPending || update.isPending}
      saveLabel={props.mode === 'dialog' ? (editing ? 'Update' : 'Create') : 'Save'}
      dialogClassName="max-w-lg"
    >
      {!editing && <p className="mb-2 text-xs text-muted-foreground">Leave Asset Code blank to get the next AST- number; the QR badge carries the code.</p>}
      <AssetFields values={values} set={set} options={options} selfId={props.asset?.id} />
    </FormFrame>
  );
}
