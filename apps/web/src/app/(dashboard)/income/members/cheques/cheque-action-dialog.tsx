'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { BankAccountSelect } from '@/components/unit-posting/collection-fields';
import { useIncomeAccounts } from '@/hooks/use-income-accounts';
import { useBounceCheque, useCancelCheque, useDepositCheque, type ReceivedCheque } from '@/hooks/use-received-cheques';
import { friendlyError } from '@/lib/api-error';
import { isRouteMissing } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';
import { unitLabel, type ChequeAction } from './cheque-columns';

const TITLES: Record<ChequeAction, string> = { deposit: 'Deposit cheque', bounce: 'Cheque bounced', cancel: 'Cancel cheque' };
const DESCRIPTIONS: Record<ChequeAction, string> = {
  deposit: 'Posts the collection on the deposit date, settling the unit’s oldest bills first.',
  bounce: 'Voids its receipt (the bills are open again). A bounce charge, if given, is posted to the unit.',
  cancel: 'For a cheque returned or withdrawn before it was banked; nothing reaches the books.',
};

interface ActionForm {
  date: string;
  bankAccountId: string;
  reason: string;
  chargeAmount: string;
  chargeAccountId: string;
}

export function actionErrors(action: ChequeAction, form: ActionForm, cheque: ReceivedCheque, today: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (action === 'deposit' && (form.date < cheque.cheque_date || form.date > today)) errors.date = `Between ${formatDate(cheque.cheque_date)} and today`;
  if (action !== 'deposit' && !form.reason.trim()) errors.reason = 'Give the reason';
  if (action === 'bounce' && form.chargeAmount.trim()) {
    if (!(Number(form.chargeAmount) > 0)) errors.chargeAmount = 'An amount above zero';
    if (!form.chargeAccountId) errors.chargeAccountId = 'Pick the account for the charge';
  }
  return errors;
}

function ChargeFields({ form, set, errors }: { form: ActionForm; set: (patch: Partial<ActionForm>) => void; errors: Record<string, string> }): ReactNode {
  const accounts = (useIncomeAccounts().data ?? []).filter((account) => account.is_active && account.income_scope !== 'non_member');
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="bounce-charge">Bounce charge (optional)</Label>
        <Input id="bounce-charge" inputMode="decimal" value={form.chargeAmount} onChange={(e) => set({ chargeAmount: e.target.value })} />
        <FormFieldError message={errors.chargeAmount} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="bounce-account">Charge account</Label>
        <Select id="bounce-account" value={form.chargeAccountId} onChange={(e) => set({ chargeAccountId: e.target.value })}>
          <option value="">Pick the account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>{account.name}</option>
          ))}
        </Select>
        <FormFieldError message={errors.chargeAccountId} />
      </div>
    </div>
  );
}

/** Deposit, Bounce or Cancel one received cheque (INC-64). */
export function ChequeActionDialog({ cheque, action, today, onClose }: { cheque: ReceivedCheque; action: ChequeAction; today: string; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const deposit = useDepositCheque();
  const bounce = useBounceCheque();
  const cancel = useCancelCheque();
  const [form, setForm] = useState<ActionForm>({ date: today, bankAccountId: '', reason: '', chargeAmount: '', chargeAccountId: '' });
  const [submitted, setSubmitted] = useState(false);
  const errors = actionErrors(action, form, cheque, today);
  const shown = submitted ? errors : {};
  const set = (patch: Partial<ActionForm>) => setForm((current) => ({ ...current, ...patch }));
  const pending = deposit.isPending || bounce.isPending || cancel.isPending;

  const done = (result: { data: ReceivedCheque }): void => {
    const chargeError = result.data.charge_error;
    addToast(
      chargeError
        ? { title: 'Bounce recorded; the charge was not posted', description: chargeError.message, variant: 'destructive' }
        : { title: `${TITLES[action]}: done`, variant: 'success' },
    );
    onClose();
  };
  const failed = (error: unknown): void => {
    const description = isRouteMissing(error) ? 'Post-dated cheques are not available yet on this server.' : friendlyError(error);
    addToast({ title: `${TITLES[action]}: not done`, description, variant: 'destructive' });
  };

  function submit(): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    const handlers = { onSuccess: done, onError: failed };
    if (action === 'deposit') deposit.mutate({ id: cheque.id, deposit_date: form.date, bank_account_id: form.bankAccountId || null }, handlers);
    if (action === 'cancel') cancel.mutate({ id: cheque.id, reason: form.reason.trim() }, handlers);
    if (action === 'bounce') {
      const charge = form.chargeAmount.trim() ? { amount: Number(form.chargeAmount), ledger_account_id: form.chargeAccountId } : undefined;
      bounce.mutate({ id: cheque.id, reason: form.reason.trim(), bounce_date: form.date, ...(charge ? { charge } : {}) }, handlers);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{TITLES[action]}</DialogTitle>
          <DialogDescription>
            {unitLabel(cheque)} · cheque {cheque.cheque_number} ({cheque.bank}) of {formatDate(cheque.cheque_date)} · {formatCurrency(cheque.amount)}. {DESCRIPTIONS[action]}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {action !== 'cancel' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cheque-date">{action === 'deposit' ? 'Deposit date' : 'Bounce date'}</Label>
                <Input id="cheque-date" type="date" value={form.date} max={today} onChange={(e) => set({ date: e.target.value })} />
                <FormFieldError message={shown.date} />
              </div>
              {action === 'deposit' && (
                <div className="space-y-1">
                  <Label htmlFor="cheque-account">Bank & Cash Account</Label>
                  <BankAccountSelect id="cheque-account" value={form.bankAccountId} onChange={(bankAccountId) => set({ bankAccountId })} />
                </div>
              )}
            </div>
          )}
          {action !== 'deposit' && (
            <div className="space-y-1">
              <Label htmlFor="cheque-reason">Reason</Label>
              <Input id="cheque-reason" maxLength={500} value={form.reason} onChange={(e) => set({ reason: e.target.value })} />
              <FormFieldError message={shown.reason} />
            </div>
          )}
          {action === 'bounce' && <ChargeFields form={form} set={set} errors={shown} />}
        </div>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
          <Button type="button" onClick={submit} disabled={pending} variant={action === 'deposit' ? 'default' : 'destructive'}>
            {pending ? 'Saving…' : TITLES[action]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
