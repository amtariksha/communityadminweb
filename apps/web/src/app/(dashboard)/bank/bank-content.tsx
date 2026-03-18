'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  Landmark,
  ArrowRightLeft,
  FileCheck,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useBankAccounts,
  useCreateBankAccount,
  useBankTransfers,
  useCreateTransfer,
  useReconciliation,
  useReconcileTransaction,
  useBRSSummary,
  useFixedDeposits,
  useCreateFD,
  useMatureFD,
  useRenewFD,
} from '@/hooks';

// API responses may include computed/joined fields beyond the base shared types
interface BankAccountRow {
  id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: string;
  branch: string;
  opening_balance: number;
  balance?: number;
  is_primary: boolean;
  is_active: boolean;
}

interface BankTransferRow {
  id: string;
  from_bank_account_id: string;
  to_bank_account_id: string;
  from_account_name?: string;
  to_account_name?: string;
  amount: number;
  transfer_date: Date;
  reference_number: string | null;
  narration: string;
}

interface FixedDepositRow {
  id: string;
  bank_account_id: string;
  bank_name?: string;
  fd_number: string;
  principal_amount: number;
  interest_rate: number;
  start_date: Date;
  maturity_date: Date;
  maturity_amount: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 20;

type ActiveTab = 'accounts' | 'transfers' | 'reconciliation' | 'fixed-deposits';

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

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

function TransferTableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function FDTableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-8 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeDaysToMaturity(maturityDate: string): number {
  const today = new Date();
  const maturity = new Date(maturityDate);
  const diffMs = maturity.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getFDStatusVariant(status: string): 'success' | 'secondary' | 'warning' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'matured':
      return 'secondary';
    case 'renewed':
      return 'warning';
    default:
      return 'default';
  }
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function BankContent(): ReactNode {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('accounts');

  // Accounts state
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false);
  const [accountBankName, setAccountBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountIfsc, setAccountIfsc] = useState('');
  const [accountType, setAccountType] = useState('savings');
  const [accountBranch, setAccountBranch] = useState('');
  const [accountOpeningBalance, setAccountOpeningBalance] = useState('');

  // Transfers state
  const [transferPage, setTransferPage] = useState(1);
  const [transferStartDate, setTransferStartDate] = useState('');
  const [transferEndDate, setTransferEndDate] = useState('');
  const [createTransferDialogOpen, setCreateTransferDialogOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [transferNarration, setTransferNarration] = useState('');

  // Reconciliation state
  const [reconAccountId, setReconAccountId] = useState('');
  const [reconStartDate, setReconStartDate] = useState('');
  const [reconEndDate, setReconEndDate] = useState('');
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [selectedReconId, setSelectedReconId] = useState('');
  const [reconStatementDate, setReconStatementDate] = useState('');
  const [reconStatementBalance, setReconStatementBalance] = useState('');

  // Fixed Deposits state
  const [createFDDialogOpen, setCreateFDDialogOpen] = useState(false);
  const [fdBankAccountId, setFdBankAccountId] = useState('');
  const [fdNumber, setFdNumber] = useState('');
  const [fdPrincipal, setFdPrincipal] = useState('');
  const [fdRate, setFdRate] = useState('');
  const [fdStartDate, setFdStartDate] = useState('');
  const [fdMaturityDate, setFdMaturityDate] = useState('');
  const [fdMaturityAmount, setFdMaturityAmount] = useState('');
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedFDId, setSelectedFDId] = useState('');
  const [renewRate, setRenewRate] = useState('');
  const [renewMaturityDate, setRenewMaturityDate] = useState('');
  const [renewMaturityAmount, setRenewMaturityAmount] = useState('');

  // Data queries
  const accountsQuery = useBankAccounts();
  const transfersQuery = useBankTransfers({
    start_date: transferStartDate || undefined,
    end_date: transferEndDate || undefined,
    page: transferPage,
    limit: ITEMS_PER_PAGE,
  });
  const reconQuery = useReconciliation(reconAccountId, reconStartDate, reconEndDate);
  const brsSummaryQuery = useBRSSummary(reconAccountId);
  const fdQuery = useFixedDeposits();

  // Mutations
  const createAccount = useCreateBankAccount();
  const createTransfer = useCreateTransfer();
  const reconcileTransaction = useReconcileTransaction();
  const createFD = useCreateFD();
  const matureFD = useMatureFD();
  const renewFD = useRenewFD();

  // Derived data
  const bankAccounts = (accountsQuery.data ?? []) as unknown as BankAccountRow[];
  const transfers = (transfersQuery.data?.data ?? []) as unknown as BankTransferRow[];
  const totalTransfers = transfersQuery.data?.total ?? 0;
  const totalTransferPages = Math.max(1, Math.ceil(totalTransfers / ITEMS_PER_PAGE));
  const reconData = reconQuery.data;
  const brsSummary = brsSummaryQuery.data;
  const fixedDeposits = (fdQuery.data ?? []) as unknown as FixedDepositRow[];

  // ---------------------------------------------------------------------------
  // Account handlers
  // ---------------------------------------------------------------------------

  function resetAccountForm(): void {
    setAccountBankName('');
    setAccountNumber('');
    setAccountIfsc('');
    setAccountType('savings');
    setAccountBranch('');
    setAccountOpeningBalance('');
  }

  function handleCreateAccount(e: FormEvent): void {
    e.preventDefault();
    createAccount.mutate(
      {
        bank_name: accountBankName,
        account_number: accountNumber,
        ifsc_code: accountIfsc,
        account_type: accountType,
        branch: accountBranch,
        opening_balance: accountOpeningBalance ? Number(accountOpeningBalance) : undefined,
      },
      {
        onSuccess() {
          setCreateAccountDialogOpen(false);
          resetAccountForm();
          addToast({ title: 'Bank account added', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to add bank account', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Transfer handlers
  // ---------------------------------------------------------------------------

  function resetTransferForm(): void {
    setTransferFromId('');
    setTransferToId('');
    setTransferAmount('');
    setTransferDate('');
    setTransferReference('');
    setTransferNarration('');
  }

  function handleCreateTransfer(e: FormEvent): void {
    e.preventDefault();
    createTransfer.mutate(
      {
        from_bank_account_id: transferFromId,
        to_bank_account_id: transferToId,
        amount: Number(transferAmount),
        transfer_date: transferDate,
        reference_number: transferReference || null,
        narration: transferNarration || undefined,
      },
      {
        onSuccess() {
          setCreateTransferDialogOpen(false);
          resetTransferForm();
          addToast({ title: 'Transfer recorded', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to record transfer', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Reconciliation handlers
  // ---------------------------------------------------------------------------

  function handleReconcile(e: FormEvent): void {
    e.preventDefault();
    reconcileTransaction.mutate(
      {
        id: selectedReconId,
        data: {
          statement_date: reconStatementDate,
          statement_balance: Number(reconStatementBalance),
        },
      },
      {
        onSuccess() {
          setReconcileDialogOpen(false);
          setSelectedReconId('');
          setReconStatementDate('');
          setReconStatementBalance('');
          addToast({ title: 'Transaction reconciled', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to reconcile', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Fixed Deposit handlers
  // ---------------------------------------------------------------------------

  function resetFDForm(): void {
    setFdBankAccountId('');
    setFdNumber('');
    setFdPrincipal('');
    setFdRate('');
    setFdStartDate('');
    setFdMaturityDate('');
    setFdMaturityAmount('');
  }

  function handleCreateFD(e: FormEvent): void {
    e.preventDefault();
    createFD.mutate(
      {
        bank_account_id: fdBankAccountId,
        fd_number: fdNumber,
        principal_amount: Number(fdPrincipal),
        interest_rate: Number(fdRate),
        start_date: fdStartDate,
        maturity_date: fdMaturityDate,
        maturity_amount: Number(fdMaturityAmount),
      },
      {
        onSuccess() {
          setCreateFDDialogOpen(false);
          resetFDForm();
          addToast({ title: 'Fixed deposit created', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to create FD', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function handleMatureFD(id: string): void {
    matureFD.mutate(id, {
      onSuccess() {
        addToast({ title: 'Fixed deposit matured', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to mature FD', description: error.message, variant: 'destructive' });
      },
    });
  }

  function handleRenewFD(e: FormEvent): void {
    e.preventDefault();
    renewFD.mutate(
      {
        id: selectedFDId,
        data: {
          interest_rate: renewRate ? Number(renewRate) : undefined,
          maturity_date: renewMaturityDate || undefined,
          maturity_amount: renewMaturityAmount ? Number(renewMaturityAmount) : undefined,
        },
      },
      {
        onSuccess() {
          setRenewDialogOpen(false);
          setSelectedFDId('');
          setRenewRate('');
          setRenewMaturityDate('');
          setRenewMaturityAmount('');
          addToast({ title: 'Fixed deposit renewed', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to renew FD', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const tabItems: Array<{ key: ActiveTab; label: string; icon: ReactNode }> = [
    { key: 'accounts', label: 'Accounts', icon: <Landmark className="mr-2 inline-block h-4 w-4" /> },
    { key: 'transfers', label: 'Transfers', icon: <ArrowRightLeft className="mr-2 inline-block h-4 w-4" /> },
    { key: 'reconciliation', label: 'Reconciliation', icon: <FileCheck className="mr-2 inline-block h-4 w-4" /> },
    { key: 'fixed-deposits', label: 'Fixed Deposits', icon: <PiggyBank className="mr-2 inline-block h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank & Treasury"
        description="Manage bank accounts, transfers, reconciliation and fixed deposits"
      />

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Accounts Tab                                                         */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={createAccountDialogOpen} onOpenChange={setCreateAccountDialogOpen}>
              <DialogTrigger>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bank Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateAccount}>
                  <DialogHeader>
                    <DialogTitle>Add Bank Account</DialogTitle>
                    <DialogDescription>Register a new bank account for the society</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="acct-bank-name">Bank Name</Label>
                      <Input
                        id="acct-bank-name"
                        required
                        placeholder="e.g., State Bank of India"
                        value={accountBankName}
                        onChange={(e) => setAccountBankName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="acct-number">Account Number</Label>
                        <Input
                          id="acct-number"
                          required
                          placeholder="Account number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acct-ifsc">IFSC Code</Label>
                        <Input
                          id="acct-ifsc"
                          required
                          placeholder="e.g., SBIN0001234"
                          value={accountIfsc}
                          onChange={(e) => setAccountIfsc(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="acct-type">Account Type</Label>
                        <Select
                          id="acct-type"
                          value={accountType}
                          onChange={(e) => setAccountType(e.target.value)}
                        >
                          <option value="savings">Savings</option>
                          <option value="current">Current</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acct-branch">Branch</Label>
                        <Input
                          id="acct-branch"
                          required
                          placeholder="Branch name"
                          value={accountBranch}
                          onChange={(e) => setAccountBranch(e.target.value)}
                        />
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
                        value={accountOpeningBalance}
                        onChange={(e) => setAccountOpeningBalance(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createAccount.isPending}>
                      {createAccount.isPending ? 'Adding...' : 'Add Account'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {accountsQuery.isLoading ? (
            <AccountCardsSkeleton />
          ) : bankAccounts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bankAccounts.map((acct) => (
                <Card key={acct.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                      {acct.bank_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(acct.balance ?? 0)}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      A/C: {acct.account_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      IFSC: {acct.ifsc_code} | {acct.branch ?? acct.account_type}
                    </p>
                    <div className="mt-2">
                      <Badge variant={acct.is_active ? 'success' : 'secondary'}>
                        {acct.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Landmark className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No bank accounts</p>
              <p className="text-sm text-muted-foreground">Add your first bank account to get started</p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Transfers Tab                                                        */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'transfers' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Inter-Account Transfers</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={transferStartDate}
                    onChange={(e) => { setTransferStartDate(e.target.value); setTransferPage(1); }}
                    className="w-36"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={transferEndDate}
                    onChange={(e) => { setTransferEndDate(e.target.value); setTransferPage(1); }}
                    className="w-36"
                  />
                </div>
                <Dialog open={createTransferDialogOpen} onOpenChange={setCreateTransferDialogOpen}>
                  <DialogTrigger>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Transfer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleCreateTransfer}>
                      <DialogHeader>
                        <DialogTitle>Create Transfer</DialogTitle>
                        <DialogDescription>Transfer funds between bank accounts</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="xfer-from">From Account</Label>
                          <Select
                            id="xfer-from"
                            required
                            value={transferFromId}
                            onChange={(e) => setTransferFromId(e.target.value)}
                          >
                            <option value="">Select source account</option>
                            {bankAccounts.map((ba) => (
                              <option key={ba.id} value={ba.id}>
                                {ba.bank_name} - {ba.account_number}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="xfer-to">To Account</Label>
                          <Select
                            id="xfer-to"
                            required
                            value={transferToId}
                            onChange={(e) => setTransferToId(e.target.value)}
                          >
                            <option value="">Select destination account</option>
                            {bankAccounts
                              .filter((ba) => ba.id !== transferFromId)
                              .map((ba) => (
                                <option key={ba.id} value={ba.id}>
                                  {ba.bank_name} - {ba.account_number}
                                </option>
                              ))}
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="xfer-amount">Amount</Label>
                            <Input
                              id="xfer-amount"
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              placeholder="0.00"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="xfer-date">Transfer Date</Label>
                            <Input
                              id="xfer-date"
                              type="date"
                              required
                              value={transferDate}
                              onChange={(e) => setTransferDate(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="xfer-ref">Reference Number</Label>
                          <Input
                            id="xfer-ref"
                            placeholder="UTR / Reference"
                            value={transferReference}
                            onChange={(e) => setTransferReference(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="xfer-narration">Narration</Label>
                          <Textarea
                            id="xfer-narration"
                            placeholder="Optional notes..."
                            value={transferNarration}
                            onChange={(e) => setTransferNarration(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={createTransfer.isPending}>
                          {createTransfer.isPending ? 'Transferring...' : 'Create Transfer'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>From Account</TableHead>
                  <TableHead>To Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Narration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfersQuery.isLoading ? (
                  <TransferTableSkeleton />
                ) : transfers.length > 0 ? (
                  transfers.map((xfer) => (
                    <TableRow key={xfer.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(String(xfer.transfer_date))}
                      </TableCell>
                      <TableCell className="font-medium">
                        {xfer.from_account_name ?? xfer.from_bank_account_id?.slice(0, 8) ?? '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {xfer.to_account_name ?? xfer.to_bank_account_id?.slice(0, 8) ?? '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(xfer.amount)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {xfer.reference_number ?? '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {xfer.narration ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : null}
              </TableBody>
            </Table>

            {!transfersQuery.isLoading && transfers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ArrowRightLeft className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No transfers found</p>
                <p className="text-sm text-muted-foreground">Record an inter-account transfer to see it here</p>
              </div>
            )}

            {totalTransferPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {transferPage} of {totalTransferPages} ({totalTransfers} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={transferPage <= 1}
                    onClick={() => setTransferPage(transferPage - 1)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={transferPage >= totalTransferPages}
                    onClick={() => setTransferPage(transferPage + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Reconciliation Tab                                                   */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bank Reconciliation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recon-account">Bank Account</Label>
                  <Select
                    id="recon-account"
                    value={reconAccountId}
                    onChange={(e) => setReconAccountId(e.target.value)}
                    className="w-64"
                  >
                    <option value="">Select bank account</option>
                    {bankAccounts.map((ba) => (
                      <option key={ba.id} value={ba.id}>
                        {ba.bank_name} - {ba.account_number}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recon-start">Start Date</Label>
                  <Input
                    id="recon-start"
                    type="date"
                    value={reconStartDate}
                    onChange={(e) => setReconStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recon-end">End Date</Label>
                  <Input
                    id="recon-end"
                    type="date"
                    value={reconEndDate}
                    onChange={(e) => setReconEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {reconAccountId && brsSummary && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Book Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(brsSummary.book_balance)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Bank Statement Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(brsSummary.statement_balance)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Difference</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${brsSummary.difference !== 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(brsSummary.difference)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {reconAccountId && reconStartDate && reconEndDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Unreconciled Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {reconQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : reconData?.unreconciled_items && reconData.unreconciled_items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconData.unreconciled_items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(item.date)}
                          </TableCell>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell className="text-right">
                            {item.type === 'debit' ? formatCurrency(item.amount) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.type === 'credit' ? formatCurrency(item.amount) : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.source_type}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 p-1 text-xs"
                              onClick={() => {
                                setSelectedReconId(item.id);
                                setReconcileDialogOpen(true);
                              }}
                            >
                              <FileCheck className="mr-1 h-3 w-3" />
                              Reconcile
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileCheck className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium">All transactions reconciled</p>
                    <p className="text-sm text-muted-foreground">No unreconciled items for this period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Fixed Deposits Tab                                                   */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'fixed-deposits' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Fixed Deposits</CardTitle>
              <Dialog open={createFDDialogOpen} onOpenChange={setCreateFDDialogOpen}>
                <DialogTrigger>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create FD
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateFD}>
                    <DialogHeader>
                      <DialogTitle>Create Fixed Deposit</DialogTitle>
                      <DialogDescription>Record a new fixed deposit investment</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="fd-bank">Bank Account</Label>
                        <Select
                          id="fd-bank"
                          required
                          value={fdBankAccountId}
                          onChange={(e) => setFdBankAccountId(e.target.value)}
                        >
                          <option value="">Select bank account</option>
                          {bankAccounts.map((ba) => (
                            <option key={ba.id} value={ba.id}>
                              {ba.bank_name} - {ba.account_number}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fd-number">FD Number</Label>
                        <Input
                          id="fd-number"
                          required
                          placeholder="FD certificate number"
                          value={fdNumber}
                          onChange={(e) => setFdNumber(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fd-principal">Principal Amount</Label>
                          <Input
                            id="fd-principal"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={fdPrincipal}
                            onChange={(e) => setFdPrincipal(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fd-rate">Interest Rate (%)</Label>
                          <Input
                            id="fd-rate"
                            type="number"
                            min="0"
                            max="20"
                            step="0.01"
                            required
                            placeholder="e.g., 7.5"
                            value={fdRate}
                            onChange={(e) => setFdRate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fd-start">Start Date</Label>
                          <Input
                            id="fd-start"
                            type="date"
                            required
                            value={fdStartDate}
                            onChange={(e) => setFdStartDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fd-maturity">Maturity Date</Label>
                          <Input
                            id="fd-maturity"
                            type="date"
                            required
                            value={fdMaturityDate}
                            onChange={(e) => setFdMaturityDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fd-maturity-amount">Maturity Amount</Label>
                        <Input
                          id="fd-maturity-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={fdMaturityAmount}
                          onChange={(e) => setFdMaturityAmount(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={createFD.isPending}>
                        {createFD.isPending ? 'Creating...' : 'Create FD'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {fdQuery.isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>FD #</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Maturity Date</TableHead>
                    <TableHead className="text-right">Maturity Amt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Days Left</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <FDTableSkeleton />
                </TableBody>
              </Table>
            ) : fixedDeposits.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>FD #</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Maturity Date</TableHead>
                    <TableHead className="text-right">Maturity Amt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Days Left</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedDeposits.map((fd) => {
                    const daysLeft = computeDaysToMaturity(String(fd.maturity_date));
                    return (
                      <TableRow key={fd.id}>
                        <TableCell>
                          <span className="font-mono text-xs">{fd.fd_number}</span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {fd.bank_name ?? '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(fd.principal_amount)}
                        </TableCell>
                        <TableCell className="text-right">{fd.interest_rate}%</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(String(fd.start_date))}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(String(fd.maturity_date))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(fd.maturity_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getFDStatusVariant(fd.status)}>
                            {fd.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {fd.status === 'active' ? (
                            <span className={daysLeft <= 30 ? 'font-medium text-warning' : ''}>
                              {daysLeft > 0 ? daysLeft : 'Overdue'}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {fd.status === 'active' && (
                            <div className="flex gap-1">
                              {daysLeft <= 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 p-1 text-xs"
                                  disabled={matureFD.isPending}
                                  onClick={() => handleMatureFD(fd.id)}
                                >
                                  <Calendar className="mr-1 h-3 w-3" />
                                  Mature
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 p-1 text-xs"
                                onClick={() => {
                                  setSelectedFDId(fd.id);
                                  setRenewDialogOpen(true);
                                }}
                              >
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Renew
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <PiggyBank className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No fixed deposits</p>
                <p className="text-sm text-muted-foreground">Create a fixed deposit to track investments</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Reconcile Transaction Dialog                                         */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={reconcileDialogOpen} onOpenChange={setReconcileDialogOpen}>
        <DialogContent>
          <form onSubmit={handleReconcile}>
            <DialogHeader>
              <DialogTitle>Reconcile Transaction</DialogTitle>
              <DialogDescription>Enter the bank statement details for this transaction</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="recon-stmt-date">Statement Date</Label>
                <Input
                  id="recon-stmt-date"
                  type="date"
                  required
                  value={reconStatementDate}
                  onChange={(e) => setReconStatementDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recon-stmt-balance">Statement Balance</Label>
                <Input
                  id="recon-stmt-balance"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={reconStatementBalance}
                  onChange={(e) => setReconStatementBalance(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={reconcileTransaction.isPending}>
                {reconcileTransaction.isPending ? 'Reconciling...' : 'Reconcile'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Renew FD Dialog                                                      */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <form onSubmit={handleRenewFD}>
            <DialogHeader>
              <DialogTitle>Renew Fixed Deposit</DialogTitle>
              <DialogDescription>Update terms for the renewed deposit</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="renew-rate">New Interest Rate (%)</Label>
                <Input
                  id="renew-rate"
                  type="number"
                  min="0"
                  max="20"
                  step="0.01"
                  placeholder="Leave blank to keep current rate"
                  value={renewRate}
                  onChange={(e) => setRenewRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="renew-maturity-date">New Maturity Date</Label>
                <Input
                  id="renew-maturity-date"
                  type="date"
                  value={renewMaturityDate}
                  onChange={(e) => setRenewMaturityDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="renew-maturity-amount">New Maturity Amount</Label>
                <Input
                  id="renew-maturity-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={renewMaturityAmount}
                  onChange={(e) => setRenewMaturityAmount(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={renewFD.isPending}>
                {renewFD.isPending ? 'Renewing...' : 'Renew FD'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
