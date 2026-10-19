'use client';

import { useState, type ReactNode } from 'react';
import type { LedgerAccount } from '@communityos/shared';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useUpdateLedgerAccount } from '@/hooks/use-ledger';
import { friendlyError } from '@/lib/api-error';
import { HSN_SAC_MESSAGE, HSN_SAC_PATTERN } from '@/lib/gst-lines';

export interface ExpenseHeadErrors {
  name?: string;
  hsn_sac?: string;
}

export function validateExpenseHead(name: string, hsnSac: string): ExpenseHeadErrors {
  const errors: ExpenseHeadErrors = {};
  if (name.trim().length < 1 || name.trim().length > 255) errors.name = 'Account Name is 1 to 255 characters';
  if (hsnSac.trim() !== '' && !HSN_SAC_PATTERN.test(hsnSac.trim())) errors.hsn_sac = HSN_SAC_MESSAGE;
  return errors;
}

interface Props {
  mode: FormMode;
  account: LedgerAccount;
  onClose: () => void;
}

/**
 * Update an expense head (EXP-S1): its name and HSN/SAC. The account number
 * is shown read-only; heads are created in General Ledger. Blank HSN/SAC
 * clears it.
 */
export function ExpenseHeadForm({ mode, account, onClose }: Props): ReactNode {
  const update = useUpdateLedgerAccount();
  const { addToast } = useToast();
  const [name, setName] = useState(account.name);
  const [hsnSac, setHsnSac] = useState(account.hsn_sac ?? '');
  const [errors, setErrors] = useState<ExpenseHeadErrors>({});

  function save(): void {
    const found = validateExpenseHead(name, hsnSac);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    update.mutate(
      { id: account.id, data: { name: name.trim(), hsn_sac: hsnSac.trim() || null } },
      {
        onSuccess: () => {
          addToast({ title: 'Expense head updated', variant: 'success' });
          onClose();
        },
        onError: (failure) => addToast({ title: 'Could not update', description: friendlyError(failure), variant: 'destructive' }),
      },
    );
  }

  return (
    <FormFrame mode={mode} open title="Update expense head" onClose={onClose} onSave={save} saving={update.isPending}>
      <div className="space-y-1">
        <Label htmlFor="head-code">Account No.</Label>
        <Input id="head-code" value={account.code} readOnly disabled />
      </div>
      <div className="space-y-1">
        <Label htmlFor="head-name">Account Name</Label>
        <Input id="head-name" value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="head-hsn">HSN/SAC</Label>
        <Input id="head-hsn" inputMode="numeric" maxLength={8} value={hsnSac} onChange={(e) => setHsnSac(e.target.value)} />
        {errors.hsn_sac && <p className="text-xs text-destructive">{errors.hsn_sac}</p>}
      </div>
    </FormFrame>
  );
}
