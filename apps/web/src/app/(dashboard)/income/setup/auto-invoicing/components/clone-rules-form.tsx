'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useCloneRules, type RuleTypeGroup } from '@/hooks/use-billing-rules';
import { ApiError, friendlyError } from '@/lib/api-error';

export interface CloneRulesFormProps {
  mode: FormMode;
  open?: boolean;
  onClose: () => void;
  onCloned?: () => void;
  source: RuleTypeGroup['category'];
  /** Every unit type of the society; the source is left out of the choices. */
  types: ReadonlyArray<RuleTypeGroup['category']>;
}

/** Setup › Auto Invoicing › Clone Rules (INC-S4): copy this type's lines to another type from a date. */
export function CloneRulesForm(props: CloneRulesFormProps): ReactNode {
  const { addToast } = useToast();
  const clone = useCloneRules();
  const [target, setTarget] = useState('');
  const [date, setDate] = useState('');
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    if (!target || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Pick the unit type to copy to and the date the copies start.');
      return;
    }
    setError(null);
    try {
      const result = await clone.mutateAsync({ from_category_id: props.source.id, to_category_id: target, effective_from: date, replace });
      addToast({ title: `${result.copied} line(s) copied`, description: result.ended ? `${result.ended} line(s) ended on the target.` : undefined, variant: 'success' });
      props.onCloned?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : friendlyError(err));
    }
  }

  return (
    <FormFrame
      mode={props.mode}
      open={props.open}
      onClose={props.onClose}
      onSave={() => void submit()}
      saving={clone.isPending}
      saveLabel="Clone"
      title="Clone Rules"
      description={`Copy the lines of ${props.source.name} in force on the date.`}
    >
      <div className="space-y-1">
        <Label htmlFor="clone-target">Copy rules to</Label>
        <Select id="clone-target" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Pick a unit type</option>
          {props.types
            .filter((type) => type.id !== props.source.id)
            .map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
        </Select>
      </div>
      <div className="max-w-xs space-y-1">
        <Label htmlFor="clone-date">Effective from</Label>
        <Input id="clone-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
        Replace lines already on the target type (they end the day before)
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </FormFrame>
  );
}
