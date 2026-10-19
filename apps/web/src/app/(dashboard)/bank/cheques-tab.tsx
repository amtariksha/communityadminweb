'use client';

import { useState, type ReactNode } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import type { LedgerAccount } from '@communityos/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCheques, type Cheque } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { BankAccountRow } from './bank-types';
import { ChequeActionDialog, chequeActions, type ChequeAction } from './cheque-actions';
import { IssueChequeDialog } from './issue-cheque-dialog';

const HEADERS = ['Cheque #', 'Payee', 'Bank', 'Amount', 'Issue Date', 'Clearing Date', 'Status', 'Clear', 'Bounce', 'Cancel'];
const ACTION_LABELS: Readonly<Record<ChequeAction, string>> = { clear: 'Clear', bounce: 'Bounce', cancel: 'Cancel' };

function statusVariant(status: Cheque['status']): 'success' | 'destructive' | 'secondary' | 'warning' {
  if (status === 'cleared') return 'success';
  if (status === 'bounced') return 'destructive';
  return status === 'cancelled' ? 'secondary' : 'warning';
}

function ChequeRow({ cheque, onAction }: { cheque: Cheque; onAction: (action: ChequeAction) => void }): ReactNode {
  const allowed = chequeActions(cheque);
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{cheque.cheque_number}</TableCell>
      <TableCell className="font-medium">{cheque.payee}</TableCell>
      <TableCell className="text-muted-foreground">{cheque.bank_name}</TableCell>
      <TableCell className="text-right">{formatCurrency(cheque.amount)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(cheque.issue_date)}</TableCell>
      <TableCell className="text-muted-foreground">{cheque.clearing_date ? formatDate(cheque.clearing_date) : '-'}</TableCell>
      <TableCell>
        <Badge variant={statusVariant(cheque.status)}>{cheque.status.charAt(0).toUpperCase() + cheque.status.slice(1)}</Badge>
      </TableCell>
      {(['clear', 'bounce', 'cancel'] as const).map((action) => (
        <TableCell key={action}>
          {allowed.includes(action) && (
            <Button type="button" variant="outline" size="sm" aria-label={`${ACTION_LABELS[action]} cheque ${cheque.cheque_number}`} onClick={() => onAction(action)}>
              {ACTION_LABELS[action]}
            </Button>
          )}
        </TableCell>
      ))}
    </TableRow>
  );
}

interface ChequesTabProps {
  accounts: readonly BankAccountRow[];
  ledgerAccounts: readonly LedgerAccount[];
}

/** /bank › Cheques: the cheque register, Issue Cheque, and Clear / Bounce / Cancel on an issued cheque (BANK-07). */
export function ChequesTab({ accounts, ledgerAccounts }: ChequesTabProps): ReactNode {
  const chequesQuery = useCheques();
  const cheques = (chequesQuery.data?.data ?? []) as Cheque[];
  const [issuing, setIssuing] = useState(false);
  const [target, setTarget] = useState<{ cheque: Cheque; action: ChequeAction } | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Cheque Management</CardTitle>
          <Button onClick={() => setIssuing(true)}><Plus className="mr-2 h-4 w-4" /> Issue Cheque</Button>
        </div>
      </CardHeader>
      <CardContent>
        {chequesQuery.isLoading || cheques.length > 0 ? (
          <Table aria-label="Cheques">
            <TableHeader>
              <TableRow>
                {HEADERS.map((header) => <TableHead key={header} className={header === 'Amount' ? 'text-right' : undefined}>{header}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {chequesQuery.isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{HEADERS.map((header) => <TableCell key={header}><Skeleton className="h-4 w-20" /></TableCell>)}</TableRow>
                  ))
                : cheques.map((cheque) => <ChequeRow key={cheque.id} cheque={cheque} onAction={(action) => setTarget({ cheque, action })} />)}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No cheques found</p>
            <p className="text-sm text-muted-foreground">Issue a cheque to see it here</p>
          </div>
        )}
      </CardContent>
      <IssueChequeDialog open={issuing} onOpenChange={setIssuing} accounts={accounts} ledgerAccounts={ledgerAccounts} />
      <ChequeActionDialog target={target} onClose={() => setTarget(null)} />
    </Card>
  );
}
