'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import type { LedgerAccount } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useCreateFD, useRenewFD } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import type { BankAccountRow } from './bank-types';

const EMPTY_FD = { bank_account_id: '', fd_number: '', principal: '', rate: '', start: '', maturity: '', maturity_amount: '', fd_account_id: '' };

function NumberField({ id, label, value, onChange, max }: { id: string; label: string; value: string; onChange: (v: string) => void; max?: string }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min="0" max={max} step="0.01" required placeholder="0.00" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function DateField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="date" required value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

interface CreateFdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: readonly BankAccountRow[];
  ledgerAccounts: readonly LedgerAccount[];
}

/** Create Fixed Deposit: Dr FD ledger / Cr bank (the API's journal). The two-form page is BANK-11. */
export function CreateFdDialog({ open, onOpenChange, accounts, ledgerAccounts }: CreateFdDialogProps): ReactNode {
  const { addToast } = useToast();
  const createFD = useCreateFD();
  const [fd, setFd] = useState(EMPTY_FD);
  const set = (patch: Partial<typeof EMPTY_FD>) => setFd((current) => ({ ...current, ...patch }));

  function submit(event: FormEvent): void {
    event.preventDefault();
    createFD.mutate(
      {
        bank_account_id: fd.bank_account_id,
        fd_number: fd.fd_number,
        principal_amount: Number(fd.principal),
        interest_rate: Number(fd.rate),
        start_date: fd.start,
        maturity_date: fd.maturity,
        maturity_amount: Number(fd.maturity_amount),
        // QA #102 — the API requires the FD ledger account.
        fd_account_id: fd.fd_account_id,
      },
      {
        onSuccess() {
          setFd(EMPTY_FD);
          onOpenChange(false);
          addToast({ title: 'Fixed deposit created', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to create FD', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create Fixed Deposit</DialogTitle>
            <DialogDescription>Record a new fixed deposit investment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fd-bank">Bank Account</Label>
              <Select id="fd-bank" required value={fd.bank_account_id} onChange={(e) => set({ bank_account_id: e.target.value })}>
                <option value="">Select bank account</option>
                {accounts.map((ba) => (
                  <option key={ba.id} value={ba.id}>{ba.bank_name} - {ba.account_number}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fd-number">FD Number</Label>
              <Input id="fd-number" required placeholder="FD certificate number" value={fd.fd_number} onChange={(e) => set({ fd_number: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NumberField id="fd-principal" label="Principal Amount" value={fd.principal} onChange={(principal) => set({ principal })} />
              <NumberField id="fd-rate" label="Interest Rate (%)" value={fd.rate} onChange={(rate) => set({ rate })} max="20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DateField id="fd-start" label="Start Date" value={fd.start} onChange={(start) => set({ start })} />
              <DateField id="fd-maturity" label="Maturity Date" value={fd.maturity} onChange={(maturity) => set({ maturity })} />
            </div>
            <NumberField id="fd-maturity-amount" label="Maturity Amount" value={fd.maturity_amount} onChange={(v) => set({ maturity_amount: v })} />
            <div className="space-y-2">
              <Label htmlFor="fd-ledger-account">FD Ledger Account</Label>
              <Select id="fd-ledger-account" required value={fd.fd_account_id} onChange={(e) => set({ fd_account_id: e.target.value })}>
                <option value="">Select FD ledger account</option>
                {ledgerAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">The asset account where the FD principal will be booked (e.g. Fixed Deposit — SBI).</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={createFD.isPending}>{createFD.isPending ? 'Creating...' : 'Create FD'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Renew a fixed deposit: a new rate and maturity date (the API recomputes the amount). */
export function RenewFdDialog({ fdId, onClose }: { fdId: string | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const renewFD = useRenewFD();
  const [rate, setRate] = useState('');
  const [maturity, setMaturity] = useState('');

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (!fdId) return;
    renewFD.mutate(
      // QA #103 — the API takes new_rate and new_maturity_date only.
      { id: fdId, data: { new_rate: rate ? Number(rate) : undefined, new_maturity_date: maturity || undefined } },
      {
        onSuccess() {
          setRate('');
          setMaturity('');
          addToast({ title: 'Fixed deposit renewed', variant: 'success' });
          onClose();
        },
        onError(error) {
          addToast({ title: 'Failed to renew FD', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={fdId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Renew Fixed Deposit</DialogTitle>
            <DialogDescription>Update terms for the renewed deposit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="renew-rate">New Interest Rate (%)</Label>
              <Input id="renew-rate" type="number" min="0" max="20" step="0.01" placeholder="Leave blank to keep current rate" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="renew-maturity-date">New Maturity Date</Label>
              <Input id="renew-maturity-date" type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} />
              <p className="text-xs text-muted-foreground">Maturity amount is recomputed from principal × new rate × tenure, so no manual entry is needed.</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={renewFD.isPending}>{renewFD.isPending ? 'Renewing...' : 'Renew FD'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
