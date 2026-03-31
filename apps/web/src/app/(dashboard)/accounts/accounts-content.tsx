'use client';

import { useState, useRef, type FormEvent, type ChangeEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, Plus, BookOpen, Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ExportButton } from '@/components/ui/export-button';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useAccountGroups,
  useLedgerAccounts,
  useFinancialYears,
  useCreateAccountGroup,
  useCreateLedgerAccount,
  useSetOpeningBalance,
  useBulkImportBalances,
} from '@/hooks';
import type { AccountGroup, LedgerAccount, AccountType } from '@communityos/shared';

// ---------------------------------------------------------------------------
// Tree building utilities
// ---------------------------------------------------------------------------

interface TreeNode {
  group: AccountGroup;
  children: TreeNode[];
  accounts: LedgerAccount[];
}

function buildTree(groups: AccountGroup[], accounts: LedgerAccount[]): TreeNode[] {
  const groupMap = new Map<string, TreeNode>();
  for (const group of groups) {
    groupMap.set(group.id, { group, children: [], accounts: [] });
  }

  for (const account of accounts) {
    const node = groupMap.get(account.group_id);
    if (node) {
      node.accounts.push(account);
    }
  }

  const roots: TreeNode[] = [];
  for (const node of groupMap.values()) {
    if (node.group.parent_id) {
      const parent = groupMap.get(node.group.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  function sortChildren(nodes: TreeNode[]): void {
    nodes.sort((a, b) => a.group.sort_order - b.group.sort_order);
    for (const node of nodes) {
      sortChildren(node.children);
    }
  }

  sortChildren(roots);
  return roots;
}

// ---------------------------------------------------------------------------
// Tree node component
// ---------------------------------------------------------------------------

interface TreeNodeViewProps {
  node: TreeNode;
  depth: number;
}

const typeColors: Record<string, string> = {
  asset: 'text-primary',
  liability: 'text-destructive',
  income: 'text-success',
  expense: 'text-warning',
};

function TreeNodeView({ node, depth }: TreeNodeViewProps): ReactNode {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0 || node.accounts.length > 0;

  return (
    <div>
      <div
        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-4" />
        )}
        <BookOpen className={`h-4 w-4 shrink-0 ${typeColors[node.group.type] ?? 'text-muted-foreground'}`} />
        <span className="text-sm font-medium">{node.group.name}</span>
        <span className="text-xs text-muted-foreground">({node.group.code})</span>
      </div>

      {expanded && (
        <>
          {node.children.map((child) => (
            <TreeNodeView key={child.group.id} node={child} depth={depth + 1} />
          ))}
          {node.accounts.map((account) => (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
              style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}
            >
              <span className="w-4" />
              <span className="text-sm">{account.name}</span>
              <span className="text-xs text-muted-foreground">({account.code})</span>
              <span className="ml-auto text-sm font-medium">
                {formatCurrency(account.opening_balance)}
              </span>
              <Badge variant="outline" className="text-xs">
                {account.balance_type === 'debit' ? 'Dr' : 'Cr'}
              </Badge>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tree skeleton
// ---------------------------------------------------------------------------

function TreeSkeleton(): ReactNode {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-8 w-full" />
          <div className="ml-5 space-y-1">
            <Skeleton className="h-7 w-[90%]" />
            <Skeleton className="h-7 w-[85%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AccountsContent(): ReactNode {
  const { addToast } = useToast();
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const { data: groups, isLoading: groupsLoading } = useAccountGroups();
  const { data: accountsResponse, isLoading: accountsLoading } = useLedgerAccounts({ limit: 500 });
  const { data: financialYears } = useFinancialYears();

  const createGroup = useCreateAccountGroup();
  const createAccount = useCreateLedgerAccount();
  const setOpeningBalance = useSetOpeningBalance();
  const bulkImportBalances = useBulkImportBalances();

  const isLoading = groupsLoading || accountsLoading;
  const accounts = accountsResponse?.data ?? [];
  const tree = groups && accounts.length >= 0 ? buildTree(groups, accounts) : [];
  const currentFY = financialYears?.find((fy) => fy.is_current);

  // -- form state for create group --
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [groupParentId, setGroupParentId] = useState('');
  const [groupType, setGroupType] = useState<AccountType>('asset');

  // -- inline create group dialog (inside create account) --
  const [inlineGroupDialogOpen, setInlineGroupDialogOpen] = useState(false);
  const [inlineGroupName, setInlineGroupName] = useState('');
  const [inlineGroupCode, setInlineGroupCode] = useState('');
  const [inlineGroupParentId, setInlineGroupParentId] = useState('');
  const [inlineGroupType, setInlineGroupType] = useState<AccountType>('asset');

  // -- form state for create account --
  const [accountName, setAccountName] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [accountGroupId, setAccountGroupId] = useState('');
  const [openingBalance, setOpeningBalanceValue] = useState('0');
  const [balanceType, setBalanceType] = useState('debit');

  function resetGroupForm(): void {
    setGroupName('');
    setGroupCode('');
    setGroupParentId('');
    setGroupType('asset');
  }

  function resetAccountForm(): void {
    setAccountName('');
    setAccountCode('');
    setAccountGroupId('');
    setOpeningBalanceValue('0');
    setBalanceType('debit');
  }

  function resetInlineGroupForm(): void {
    setInlineGroupName('');
    setInlineGroupCode('');
    setInlineGroupParentId('');
    setInlineGroupType('asset');
  }

  function handleInlineCreateGroup(e: FormEvent): void {
    e.preventDefault();

    createGroup.mutate(
      {
        name: inlineGroupName,
        code: inlineGroupCode,
        parent_id: inlineGroupParentId || null,
        type: inlineGroupType,
      },
      {
        onSuccess(response) {
          setInlineGroupDialogOpen(false);
          resetInlineGroupForm();
          setAccountGroupId(response.data.id);
          addToast({ title: 'Account group created', variant: 'success' });
        },
        onError(error) {
          addToast({
            title: 'Failed to create group',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleCreateGroup(e: FormEvent): void {
    e.preventDefault();

    createGroup.mutate(
      {
        name: groupName,
        code: groupCode,
        parent_id: groupParentId || null,
        type: groupType,
      },
      {
        onSuccess() {
          setGroupDialogOpen(false);
          resetGroupForm();
          addToast({ title: 'Account group created', variant: 'success' });
        },
        onError(error) {
          addToast({
            title: 'Failed to create group',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleCreateAccount(e: FormEvent): void {
    e.preventDefault();

    const balance = Number(openingBalance);

    createAccount.mutate(
      {
        name: accountName,
        code: accountCode,
        group_id: accountGroupId,
        opening_balance: balance,
        balance_type: balanceType,
      },
      {
        onSuccess(response) {
          if (balance > 0) {
            setOpeningBalance.mutate(
              {
                account_id: response.data.id,
                amount: balance,
                balance_type: balanceType,
              },
              {
                onSuccess() {
                  addToast({ title: 'Ledger account created with opening balance', variant: 'success' });
                },
                onError() {
                  addToast({
                    title: 'Account created but opening balance failed',
                    description: 'You can set it later from the account detail page.',
                    variant: 'destructive',
                  });
                },
              },
            );
          } else {
            addToast({ title: 'Ledger account created', variant: 'success' });
          }
          setAccountDialogOpen(false);
          resetAccountForm();
        },
        onError(error) {
          addToast({
            title: 'Failed to create account',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  // -- CSV import state --
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<Array<{
    account_code: string;
    amount: number;
    balance_type: string;
    account_id: string | null;
    account_name: string | null;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDownloadTemplate(): void {
    const csv = 'account_code,amount,balance_type\n1001,50000,debit\n2001,30000,credit\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opening_balances_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function onLoad(event) {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      if (lines.length < 2) {
        addToast({ title: 'CSV file is empty or has no data rows', variant: 'destructive' });
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const codeIdx = headers.indexOf('account_code');
      const amountIdx = headers.indexOf('amount');
      const typeIdx = headers.indexOf('balance_type');

      if (codeIdx === -1 || amountIdx === -1) {
        addToast({ title: 'CSV must have account_code and amount columns', variant: 'destructive' });
        return;
      }

      const parsed = lines.slice(1).map(function parseRow(line) {
        const cols = line.split(',').map((c) => c.trim());
        const code = cols[codeIdx] ?? '';
        const matchedAccount = accounts.find((a) => a.code === code);

        return {
          account_code: code,
          amount: parseFloat(cols[amountIdx] ?? '0') || 0,
          balance_type: typeIdx !== -1 ? (cols[typeIdx] ?? 'debit') : 'debit',
          account_id: matchedAccount?.id ?? null,
          account_name: matchedAccount?.name ?? null,
        };
      }).filter((row) => row.account_code && row.amount > 0);

      setImportRows(parsed);
    };
    reader.readAsText(file);
  }

  function handleImportSubmit(): void {
    const validRows = importRows.filter((r) => r.account_id);
    if (validRows.length === 0) {
      addToast({ title: 'No valid rows to import', variant: 'destructive' });
      return;
    }

    bulkImportBalances.mutate(
      {
        balances: validRows.map((r) => ({
          account_id: r.account_id as string,
          amount: r.amount,
          balance_type: r.balance_type,
        })),
      },
      {
        onSuccess() {
          addToast({ title: `Opening balances updated for ${validRows.length} accounts`, variant: 'success' });
          setImportDialogOpen(false);
          setImportRows([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        onError(error: Error) {
          addToast({ title: 'Import failed', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // Build a flat list of groups for the select dropdowns
  const flatGroups = groups ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Accounts' }]}
        title="Chart of Accounts"
        description={
          currentFY
            ? `Financial Year: ${currentFY.label}`
            : 'Manage your account groups and ledger accounts'
        }
        actions={
          <>
            <ExportButton
              data={accounts as unknown as Record<string, unknown>[]}
              filename={`accounts-${new Date().toISOString().split('T')[0]}`}
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Account Name' },
                { key: 'opening_balance', label: 'Opening Balance' },
                { key: 'balance_type', label: 'Balance Type' },
              ]}
            />
            <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
              <DialogTrigger>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateGroup}>
                  <DialogHeader>
                    <DialogTitle>Create Account Group</DialogTitle>
                    <DialogDescription>Add a new group to organize your accounts</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">Group Name</Label>
                      <Input
                        id="group-name"
                        placeholder="e.g., Fixed Assets"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group-code">Group Code</Label>
                      <Input
                        id="group-code"
                        placeholder="e.g., 1300"
                        value={groupCode}
                        onChange={(e) => setGroupCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group-parent" className="flex items-center gap-1">
                        Parent Group
                        <HelpTooltip text="Root groups (no parent) are top-level categories like Income, Expense, Assets, Liabilities. Sub-groups nest under a parent to create a multi-level hierarchy." />
                      </Label>
                      <Select
                        id="group-parent"
                        value={groupParentId}
                        onChange={(e) => setGroupParentId(e.target.value)}
                      >
                        <option value="">No parent (root group)</option>
                        {flatGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.code})
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group-type">Type</Label>
                      <Select
                        id="group-type"
                        value={groupType}
                        onChange={(e) => setGroupType(e.target.value as AccountType)}
                        required
                      >
                        <option value="asset">Asset</option>
                        <option value="liability">Liability</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createGroup.isPending}>
                      {createGroup.isPending ? 'Creating...' : 'Create Group'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) { setImportRows([]); if (fileInputRef.current) fileInputRef.current.value = ''; } }}>
              <DialogTrigger>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import Balances
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Opening Balances</DialogTitle>
                  <DialogDescription>Upload a CSV file with account codes and opening balances</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-4">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      Template
                    </Button>
                  </div>

                  {importRows.length > 0 && (
                    <div className="max-h-64 overflow-y-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account Code</TableHead>
                            <TableHead>Matched Account</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="w-8" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importRows.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">{row.account_code}</TableCell>
                              <TableCell>
                                {row.account_name ? (
                                  <span className="text-sm">{row.account_name}</span>
                                ) : (
                                  <span className="text-sm text-destructive">Not found</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{row.balance_type === 'debit' ? 'Dr' : 'Cr'}</Badge>
                              </TableCell>
                              <TableCell>
                                {row.account_id ? (
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {importRows.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {importRows.filter((r) => r.account_id).length} of {importRows.length} rows matched.
                      {importRows.filter((r) => !r.account_id).length > 0 && ' Unmatched rows will be skipped.'}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={handleImportSubmit}
                    disabled={bulkImportBalances.isPending || importRows.filter((r) => r.account_id).length === 0}
                  >
                    {bulkImportBalances.isPending ? 'Importing...' : `Import ${importRows.filter((r) => r.account_id).length} Balances`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
              <DialogTrigger>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateAccount}>
                  <DialogHeader>
                    <DialogTitle>Create Ledger Account</DialogTitle>
                    <DialogDescription>Add a new ledger account under a group</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="account-name">Account Name</Label>
                      <Input
                        id="account-name"
                        placeholder="e.g., ICICI Bank"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-code">Account Code</Label>
                      <Input
                        id="account-code"
                        placeholder="e.g., 1113"
                        value={accountCode}
                        onChange={(e) => setAccountCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-group">Group</Label>
                      <div className="flex gap-2">
                        <Select
                          id="account-group"
                          value={accountGroupId}
                          onChange={(e) => setAccountGroupId(e.target.value)}
                          required
                          className="flex-1"
                        >
                          <option value="">Select group</option>
                          {flatGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} ({g.code})
                            </option>
                          ))}
                        </Select>
                        <Dialog open={inlineGroupDialogOpen} onOpenChange={setInlineGroupDialogOpen}>
                          <DialogTrigger>
                            <Button type="button" variant="outline" size="sm" className="shrink-0">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <form onSubmit={handleInlineCreateGroup}>
                              <DialogHeader>
                                <DialogTitle>Create Account Group</DialogTitle>
                                <DialogDescription>Quickly add a new group for this account</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="inline-group-name">Group Name</Label>
                                  <Input
                                    id="inline-group-name"
                                    placeholder="e.g., Fixed Assets"
                                    value={inlineGroupName}
                                    onChange={(e) => setInlineGroupName(e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="inline-group-code">Group Code</Label>
                                  <Input
                                    id="inline-group-code"
                                    placeholder="e.g., 1300"
                                    value={inlineGroupCode}
                                    onChange={(e) => setInlineGroupCode(e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="inline-group-type">Type</Label>
                                  <Select
                                    id="inline-group-type"
                                    value={inlineGroupType}
                                    onChange={(e) => setInlineGroupType(e.target.value as AccountType)}
                                    required
                                  >
                                    <option value="asset">Asset</option>
                                    <option value="liability">Liability</option>
                                    <option value="income">Income</option>
                                    <option value="expense">Expense</option>
                                    <option value="equity">Equity</option>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="inline-group-parent">Parent Group</Label>
                                  <Select
                                    id="inline-group-parent"
                                    value={inlineGroupParentId}
                                    onChange={(e) => setInlineGroupParentId(e.target.value)}
                                  >
                                    <option value="">No parent (root group)</option>
                                    {flatGroups.map((g) => (
                                      <option key={g.id} value={g.id}>
                                        {g.name} ({g.code})
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose>
                                  <Button type="button" variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" disabled={createGroup.isPending}>
                                  {createGroup.isPending ? 'Creating...' : 'Create Group'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="opening-balance">Opening Balance</Label>
                      <Input
                        id="opening-balance"
                        type="number"
                        placeholder="0"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalanceValue(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="balance-type">Balance Type</Label>
                      <Select
                        id="balance-type"
                        value={balanceType}
                        onChange={(e) => setBalanceType(e.target.value)}
                        required
                      >
                        <option value="debit">Debit (Dr)</option>
                        <option value="credit">Credit (Cr)</option>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createAccount.isPending}>
                      {createAccount.isPending ? 'Creating...' : 'Create Account'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TreeSkeleton />
          ) : tree.length > 0 ? (
            <div className="space-y-0.5">
              {tree.map((node) => (
                <TreeNodeView key={node.group.id} node={node} depth={0} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No account groups found</p>
              <p className="text-sm text-muted-foreground">
                Create your first account group to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
