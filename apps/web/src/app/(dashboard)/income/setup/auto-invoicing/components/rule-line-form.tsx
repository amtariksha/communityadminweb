'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useLedgerAccounts } from '@/hooks/use-ledger';
import { useAddRuleLine, useReviseRuleLine, type RuleLine } from '@/hooks/use-billing-rules';
import { ApiError, friendlyError } from '@/lib/api-error';
import { RuleLineFields } from './rule-line-fields';
import { RuleTypeStrip } from './rule-type-strip';
import { initialValues, toFees, validateRuleLine, type RuleLineFormErrors, type RuleLineFormValues } from './rule-line-values';

export interface RuleLineFormProps {
  mode: FormMode;
  /** Dialog only. */
  open?: boolean;
  onClose: () => void;
  onSaved?: (line: RuleLine) => void;
  category: { id: string; name: string };
  /** The version being revised; absent = Add Line Item. */
  line?: RuleLine;
  /** Extra controls under the form (End this line from…). */
  footer?: ReactNode;
}

function AccountField(props: {
  line?: RuleLine;
  value: string;
  error?: string;
  onChange: (id: string) => void;
}): ReactNode {
  const accounts = useLedgerAccounts({ account_type: 'income', income_scope: 'member', limit: 100 });
  if (props.line) {
    return (
      <p className="text-sm">
        <span className="text-muted-foreground">Income Account: </span>
        {props.line.account_name}
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <Label htmlFor="rule-account">Income Account</Label>
      <Select id="rule-account" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">Pick an income account</option>
        {(accounts.data?.data ?? []).map((account) => (
          <option key={account.id} value={account.id}>
            {account.code ? `${account.code} — ` : ''}
            {account.name}
          </option>
        ))}
      </Select>
      {props.error && <p className="text-xs text-destructive">{props.error}</p>}
    </div>
  );
}

/**
 * Setup › Auto Invoicing › Add Line Item / Edit Line Item (INC-S3): a dialog
 * in the standard layout, a page in classic (SB-07). Edit never overwrites:
 * it saves a new version from its date and the old one closes the day before.
 */
export function RuleLineForm(props: RuleLineFormProps): ReactNode {
  const { line, category } = props;
  const { addToast } = useToast();
  const add = useAddRuleLine();
  const revise = useReviseRuleLine();
  const [values, setValues] = useState<RuleLineFormValues>(() => initialValues(line));
  const [errors, setErrors] = useState<RuleLineFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function change<K extends keyof RuleLineFormValues>(key: K, value: RuleLineFormValues[K]): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function save(): Promise<void> {
    const found = validateRuleLine(values, { revising: Boolean(line), after: line?.effective_from });
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    try {
      const saved = line
        ? await revise.mutateAsync({ id: line.id, ...toFees(values) })
        : await add.mutateAsync({ category_id: category.id, ledger_account_id: values.ledger_account_id, ...toFees(values) });
      addToast({ title: line ? 'New version saved' : 'Line item added', variant: 'success' });
      props.onSaved?.(saved);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : friendlyError(error));
    }
  }

  return (
    <FormFrame
      mode={props.mode}
      open={props.open}
      onClose={props.onClose}
      onSave={() => void save()}
      saving={add.isPending || revise.isPending}
      saveLabel={line ? 'Save Changes' : 'Save'}
      title={line ? 'Revise auto-invoice rule for unit type' : 'Add Line Item'}
      description={`Unit type: ${category.name}${line ? ` · Version from ${line.effective_from}` : ''}`}
      dialogClassName="sm:max-w-2xl"
    >
      <RuleTypeStrip />
      <AccountField line={line} value={values.ledger_account_id} error={errors.ledger_account_id} onChange={(id) => change('ledger_account_id', id)} />
      <RuleLineFields values={values} errors={errors} change={change} />
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      {props.footer}
    </FormFrame>
  );
}
