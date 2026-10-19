'use client';

import { useState, type ReactNode } from 'react';
import { Landmark, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { AddBankAccountForm } from './add-bank-account-form';
import { DeleteBankAccountDialog } from './bank-account-dialogs';
import type { BankAccountRow } from './bank-types';

function AccountCardsSkeleton(): ReactNode {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AccountCard({ account, onDelete }: { account: BankAccountRow; onDelete: () => void }): ReactNode {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            {account.bank_name}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" aria-label={`Delete ${account.bank_name}`} title="Delete bank account" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{formatCurrency(account.current_balance ?? 0)}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">A/C: {account.account_number}</p>
        <p className="text-xs text-muted-foreground">
          IFSC: {account.ifsc_code} | {account.branch || account.account_type}
        </p>
        <div className="mt-2">
          <Badge variant={account.is_active ? 'success' : 'secondary'}>{account.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface AccountsTabProps {
  accounts: readonly BankAccountRow[];
  loading: boolean;
}

/** /bank › Accounts: the bank account cards with Add and Delete. */
export function AccountsTab({ accounts, loading }: AccountsTabProps): ReactNode {
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bank Account
        </Button>
      </div>
      {loading ? (
        <AccountCardsSkeleton />
      ) : accounts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} onDelete={() => setDeleting(account.id)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Landmark className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No bank accounts</p>
          <p className="text-sm text-muted-foreground">Add your first bank account to get started</p>
        </div>
      )}
      <AddBankAccountForm mode="dialog" open={adding} onClose={() => setAdding(false)} onSaved={() => setAdding(false)} />
      <DeleteBankAccountDialog accountId={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
