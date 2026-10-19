'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useCreateBankAccount } from '@/hooks';
import { friendlyError } from '@/lib/api-error';

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const EMPTY = { bank_name: '', account_number: '', ifsc_code: '', account_type: 'savings', branch: '', opening_balance: '' };

interface AddBankAccountFormProps {
  mode: FormMode;
  open?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Add Bank Account (SB-07): the standard dialog, or Bank & Cash Accounts ›
 * Add account as a page in classic (BANK-S11; petty cash is BANK-14). The
 * opening balance is posted as an opening-balance entry (BANK-03).
 */
export function AddBankAccountForm({ mode, open, onClose, onSaved }: AddBankAccountFormProps): ReactNode {
  const { addToast } = useToast();
  const createAccount = useCreateBankAccount();
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof EMPTY>) => setDraft((current) => ({ ...current, ...patch }));

  function save(): void {
    if (!draft.bank_name.trim() || !draft.account_number.trim() || !draft.branch.trim()) {
      setError('Enter the bank name, account number and branch.');
      return;
    }
    if (!IFSC.test(draft.ifsc_code)) {
      setError('IFSC must be 4 letters, 0, then 6 letters or digits (e.g. SBIN0001234).');
      return;
    }
    setError(null);
    createAccount.mutate(
      {
        bank_name: draft.bank_name.trim(),
        account_number: draft.account_number.trim(),
        ifsc_code: draft.ifsc_code,
        account_type: draft.account_type,
        branch: draft.branch.trim(),
        opening_balance: draft.opening_balance ? Number(draft.opening_balance) : undefined,
      },
      {
        onSuccess() {
          setDraft(EMPTY);
          addToast({ title: 'Bank account added', variant: 'success' });
          onSaved();
        },
        onError(failure) {
          setError(friendlyError(failure));
        },
      },
    );
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title="Add Bank Account"
      description="Register a new bank account for the society"
      onClose={() => { setError(null); onClose(); }}
      onSave={save}
      saving={createAccount.isPending}
      saveLabel="Add Account"
      savingLabel="Adding…"
    >
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="acct-bank-name">Bank Name</Label>
        <Input id="acct-bank-name" required placeholder="e.g., State Bank of India" value={draft.bank_name} onChange={(e) => set({ bank_name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="acct-number">Account Number</Label>
          <Input id="acct-number" required placeholder="Account number" value={draft.account_number} onChange={(e) => set({ account_number: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acct-ifsc">IFSC Code</Label>
          <Input
            id="acct-ifsc"
            required
            placeholder="e.g., SBIN0001234"
            maxLength={11}
            style={{ textTransform: 'uppercase' }}
            value={draft.ifsc_code}
            onChange={(e) => set({ ifsc_code: e.target.value.toUpperCase() })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="acct-type">Account Type</Label>
          <Select id="acct-type" value={draft.account_type} onChange={(e) => set({ account_type: e.target.value })}>
            <option value="savings">Savings</option>
            <option value="current">Current</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acct-branch">Branch</Label>
          <Input id="acct-branch" required placeholder="Branch name" value={draft.branch} onChange={(e) => set({ branch: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="acct-opening-balance">Opening Balance</Label>
        <Input
          id="acct-opening-balance"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={draft.opening_balance}
          onChange={(e) => set({ opening_balance: e.target.value })}
        />
      </div>
    </FormFrame>
  );
}
