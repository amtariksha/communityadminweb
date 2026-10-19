'use client';

import { useState, type ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { EditBankAccountDialog } from '../../bank/bank-account-dialogs';
import { accountLabel, type BankAccountRow } from '../../bank/bank-types';

function Tile({ account, onEdit }: { account: BankAccountRow; onEdit?: () => void }): ReactNode {
  const book = account.book_balance ?? account.current_balance ?? 0;
  return (
    <Card>
      <CardContent className="space-y-1 pt-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{accountLabel(account)}</p>
          {onEdit && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" aria-label={`Edit ${account.bank_name}`} onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Book</dt>
            <dd className="font-semibold">{formatCurrency(book)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Bank</dt>
            {/* An API older than BANK-08 sends no bank balance. */}
            <dd className="font-semibold">{account.bank_balance === undefined ? '—' : formatCurrency(account.bank_balance)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

/** One tile per bank account with its Book and Bank balances (BANK-S3, BANK-08); Edit on each (BANK-07). */
export function BalanceTiles({ accounts, canEdit }: { accounts: readonly BankAccountRow[]; canEdit: boolean }): ReactNode {
  const [editing, setEditing] = useState<BankAccountRow | null>(null);
  if (accounts.length === 0) return <p className="text-sm text-muted-foreground">No bank accounts yet. Add one under Add account.</p>;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Account balances" role="list">
        {accounts.map((account) => (
          <div role="listitem" key={account.id}>
            <Tile account={account} onEdit={canEdit ? () => setEditing(account) : undefined} />
          </div>
        ))}
      </div>
      <EditBankAccountDialog account={editing} onClose={() => setEditing(null)} />
    </>
  );
}
