'use client';

import { useState, useRef, type FormEvent, type ChangeEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, Plus, BookOpen, Upload, Download, AlertCircle, CheckCircle2, Pencil, FileUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import { ExportButton } from '@/components/ui/export-button';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useAccountGroups,
  useLedgerAccounts,
  useFinancialYears,
  useCreateAccountGroup,
  useUpdateAccountGroup,
  useCreateLedgerAccount,
  useUpdateLedgerAccount,
  useSetOpeningBalance,
  useBulkImportBalances,
  useTallyXmlImport,
  useTallyCsvImport,
} from '@/hooks';
import type { TallyImportResult } from '@/hooks/use-tally-import';
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
  onEditGroup: (group: AccountGroup) => void;
  onEditAccount: (account: LedgerAccount) => void;
}

const typeColors: Record<string, string> = {
  asset: 'text-primary',
  liability: 'text-destructive',
  income: 'text-success',
  expense: 'text-warning',
};

function TreeNodeView({ node, depth, onEditGroup, onEditAccount }: TreeNodeViewProps): ReactNode {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0 || node.accounts.length > 0;

  return (
    <div>
      <div
        className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
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
        <button
          type="button"
          className="ml-1 hidden rounded p-0.5 hover:bg-muted group-hover:inline-flex"
          onClick={(e) => {
            e.stopPropagation();
            onEditGroup(node.group);
          }}
          title="Edit group"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {expanded && (
        <>
          {node.children.map((child) => (
            <TreeNodeView
              key={child.group.id}
              node={child}
              depth={depth + 1}
              onEditGroup={onEditGroup}
              onEditAccount={onEditAccount}
            />
          ))}
          {node.accounts.map((account) => (
            <div
              key={account.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
              style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}
            >
              <span className="w-4" />
              <Link
                href={`/accounts/${account.id}`}
                className="flex flex-1 items-center gap-2"
              >
                <span className="text-sm">{account.name}</span>
                <span className="text-xs text-muted-foreground">({account.code})</span>
                <span className="ml-auto text-sm font-medium">
                  {formatCurrency(account.opening_balance)}
                </span>
                <Badge variant="outline" className="text-xs">
                  {account.balance_type === 'debit' ? 'Dr' : 'Cr'}
                </Badge>
              </Link>
              <button
                type="button"
                className="hidden rounded p-0.5 hover:bg-muted group-hover:inline-flex"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditAccount(account);
                }}
                title="Edit account"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
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
  const updateGroup = useUpdateAccountGroup();
  const createAccount = useCreateLedgerAccount();
  const updateAccount = useUpdateLedgerAccount();
  const setOpeningBalance = useSetOpeningBalance();
  const bulkImportBalances = useBulkImportBalances();
  const tallyXmlImport = useTallyXmlImport();
  const tallyCsvImport = useTallyCsvImport();

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

  // -- edit group dialog state --
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupCode, setEditGroupCode] = useState('');
  const [editGroupType, setEditGroupType] = useState<AccountType>('asset');

  // -- edit account dialog state --
  const [editAccountDialogOpen, setEditAccountDialogOpen] = useState(false);
  const [editAccountId, setEditAccountId] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountCode, setEditAccountCode] = useState('');
  const [editAccountGroupId, setEditAccountGroupId] = useState('');
  const [editAccountOpeningBalance, setEditAccountOpeningBalance] = useState('0');
  const [editAccountBalanceType, setEditAccountBalanceType] = useState('debit');

  // -- Tally import state --
  const [tallyDialogOpen, setTallyDialogOpen] = useState(false);
  const [tallyFormat, setTallyFormat] = useState<'xml' | 'csv'>('xml');
  const [tallyContent, setTallyContent] = useState('');
  const [tallyCsvType, setTallyCsvType] = useState<'trial_balance' | 'day_book' | 'ledger_report' | 'receipt_register' | 'payment_register'>('trial_balance');
  const [tallyResult, setTallyResult] = useState<TallyImportResult | null>(null);
  const [tallyStep, setTallyStep] = useState<'input' | 'preview' | 'done'>('input');

  function resetTallyForm(): void {
    setTallyContent('');
    setTallyCsvType('trial_balance');
    setTallyResult(null);
    setTallyStep('input');
    setTallyFormat('xml');
  }

  function handleTallyParse(): void {
    if (!tallyContent.trim()) {
      addToast({ title: 'Paste content to import', variant: 'destructive' });
      return;
    }

    if (tallyFormat === 'xml') {
      tallyXmlImport.mutate(
        { xml_content: tallyContent, import_type: 'all' },
        {
          onSuccess(data) {
            setTallyResult(data.data);
            setTallyStep('preview');
            addToast({ title: 'Tally XML parsed successfully', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to parse Tally XML', description: error.message, variant: 'destructive' });
          },
        },
      );
    } else {
      tallyCsvImport.mutate(
        { csv_content: tallyContent, import_type: tallyCsvType },
        {
          onSuccess(data) {
            setTallyResult(data.data);
            setTallyStep('preview');
            addToast({ title: 'Tally CSV parsed successfully', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to parse Tally CSV', description: error.message, variant: 'destructive' });
          },
        },
      );
    }
  }

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

  function handleOpenEditGroup(group: AccountGroup): void {
    setEditGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupCode(group.code);
    setEditGroupType(group.type as AccountType);
    setEditGroupDialogOpen(true);
  }

  function handleEditGroup(e: FormEvent): void {
    e.preventDefault();
    if (!editGroupId) return;

    updateGroup.mutate(
      {
        id: editGroupId,
        data: {
          name: editGroupName,
          code: editGroupCode,
          type: editGroupType,
        },
      },
      {
        onSuccess() {
          setEditGroupDialogOpen(false);
          addToast({ title: 'Account group updated', variant: 'success' });
        },
        onError(error) {
          addToast({
            title: 'Failed to update group',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleOpenEditAccount(account: LedgerAccount): void {
    setEditAccountId(account.id);
    setEditAccountName(account.name);
    setEditAccountCode(account.code);
    setEditAccountGroupId(account.group_id);
    setEditAccountOpeningBalance(String(account.opening_balance ?? 0));
    setEditAccountBalanceType(account.balance_type ?? 'debit');
    setEditAccountDialogOpen(true);
  }

  function handleEditAccount(e: FormEvent): void {
    e.preventDefault();
    if (!editAccountId) return;

    updateAccount.mutate(
      {
        id: editAccountId,
        data: {
          name: editAccountName,
          code: editAccountCode,
          group_id: editAccountGroupId,
          opening_balance: Number(editAccountOpeningBalance),
          balance_type: editAccountBalanceType,
        },
      },
      {
        onSuccess() {
          setEditAccountDialogOpen(false);
          addToast({ title: 'Ledger account updated', variant: 'success' });
        },
        onError(error) {
          addToast({
            title: 'Failed to update account',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
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
            <Button variant="outline" onClick={() => { resetTallyForm(); setTallyDialogOpen(true); }}>
              <FileUp className="mr-2 h-4 w-4" />
              Import from Tally
            </Button>
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInlineGroupDialogOpen(true); }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Dialog open={inlineGroupDialogOpen} onOpenChange={setInlineGroupDialogOpen}>
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
                <TreeNodeView
                  key={node.group.id}
                  node={node}
                  depth={0}
                  onEditGroup={handleOpenEditGroup}
                  onEditAccount={handleOpenEditAccount}
                />
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

      {/* Edit Account Group Dialog */}
      <Dialog open={editGroupDialogOpen} onOpenChange={setEditGroupDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditGroup}>
            <DialogHeader>
              <DialogTitle>Edit Account Group</DialogTitle>
              <DialogDescription>Update group details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-group-name">Group Name</Label>
                <Input
                  id="edit-group-name"
                  placeholder="e.g., Fixed Assets"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-group-code">Group Code</Label>
                <Input
                  id="edit-group-code"
                  placeholder="e.g., 1300"
                  value={editGroupCode}
                  onChange={(e) => setEditGroupCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-group-type">Type</Label>
                <Select
                  id="edit-group-type"
                  value={editGroupType}
                  onChange={(e) => setEditGroupType(e.target.value as AccountType)}
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
              <Button type="submit" disabled={updateGroup.isPending}>
                {updateGroup.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Ledger Account Dialog */}
      <Dialog open={editAccountDialogOpen} onOpenChange={setEditAccountDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditAccount}>
            <DialogHeader>
              <DialogTitle>Edit Ledger Account</DialogTitle>
              <DialogDescription>Update account details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-account-name">Account Name</Label>
                <Input
                  id="edit-account-name"
                  placeholder="e.g., ICICI Bank"
                  value={editAccountName}
                  onChange={(e) => setEditAccountName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-account-code">Account Code</Label>
                <Input
                  id="edit-account-code"
                  placeholder="e.g., 1113"
                  value={editAccountCode}
                  onChange={(e) => setEditAccountCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-account-group">Group</Label>
                <Select
                  id="edit-account-group"
                  value={editAccountGroupId}
                  onChange={(e) => setEditAccountGroupId(e.target.value)}
                  required
                >
                  <option value="">Select group</option>
                  {flatGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-opening-balance">Opening Balance</Label>
                <Input
                  id="edit-opening-balance"
                  type="number"
                  placeholder="0"
                  value={editAccountOpeningBalance}
                  onChange={(e) => setEditAccountOpeningBalance(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-balance-type">Balance Type</Label>
                <Select
                  id="edit-balance-type"
                  value={editAccountBalanceType}
                  onChange={(e) => setEditAccountBalanceType(e.target.value)}
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
              <Button type="submit" disabled={updateAccount.isPending}>
                {updateAccount.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tally Import Dialog */}
      <Dialog open={tallyDialogOpen} onOpenChange={setTallyDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from Tally</DialogTitle>
            <DialogDescription>Import account groups, ledgers, and vouchers from Tally ERP</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {tallyStep === 'input' && (
              <>
                {/* Format selector */}
                <div className="space-y-2">
                  <Label>Format</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tally-format"
                        value="xml"
                        checked={tallyFormat === 'xml'}
                        onChange={() => setTallyFormat('xml')}
                        className="accent-primary"
                      />
                      <span className="text-sm">XML</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tally-format"
                        value="csv"
                        checked={tallyFormat === 'csv'}
                        onChange={() => setTallyFormat('csv')}
                        className="accent-primary"
                      />
                      <span className="text-sm">CSV</span>
                    </label>
                  </div>
                </div>

                {/* CSV report type */}
                {tallyFormat === 'csv' && (
                  <div className="space-y-2">
                    <Label htmlFor="tally-csv-type">Report Type</Label>
                    <Select
                      id="tally-csv-type"
                      value={tallyCsvType}
                      onChange={(e) => setTallyCsvType(e.target.value as typeof tallyCsvType)}
                    >
                      <option value="trial_balance">Trial Balance</option>
                      <option value="day_book">Day Book</option>
                      <option value="ledger_report">Ledger Report</option>
                      <option value="receipt_register">Receipt Register</option>
                      <option value="payment_register">Payment Register</option>
                    </Select>
                  </div>
                )}

                {/* Content area */}
                <div className="space-y-2">
                  <Label htmlFor="tally-content">
                    {tallyFormat === 'xml' ? 'Paste XML Content' : 'Paste CSV Content'}
                  </Label>
                  <Textarea
                    id="tally-content"
                    value={tallyContent}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTallyContent(e.target.value)}
                    placeholder={tallyFormat === 'xml' ? '<ENVELOPE>...</ENVELOPE>' : 'Paste CSV data here...'}
                    rows={10}
                    className="font-mono text-xs"
                  />
                </div>
              </>
            )}

            {tallyStep === 'preview' && tallyResult && (
              <div className="space-y-4">
                <div className="rounded-md border p-4 space-y-2">
                  <h4 className="font-medium text-sm">Import Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Records Parsed:</div>
                    <div className="font-medium">{tallyResult.records_parsed}</div>
                    <div>Records Imported:</div>
                    <div className="font-medium text-green-600">{tallyResult.records_imported}</div>
                    <div>Records Skipped:</div>
                    <div className="font-medium text-yellow-600">{tallyResult.records_skipped}</div>
                    <div>Records Failed:</div>
                    <div className="font-medium text-red-600">{tallyResult.records_failed}</div>
                  </div>
                  {Object.keys(tallyResult.summary).length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="text-xs font-medium text-muted-foreground mb-1">Breakdown</h5>
                      {Object.entries(tallyResult.summary).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {tallyResult.errors.length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 space-y-1">
                    <h4 className="font-medium text-sm text-red-700 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Errors ({tallyResult.errors.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {tallyResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400">
                          {err.row !== undefined && `Row ${err.row}: `}{err.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {tallyResult.records_imported > 0 && (
                  <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Successfully imported {tallyResult.records_imported} records
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                {tallyStep === 'preview' ? 'Close' : 'Cancel'}
              </Button>
            </DialogClose>
            {tallyStep === 'input' && (
              <Button
                onClick={handleTallyParse}
                disabled={tallyXmlImport.isPending || tallyCsvImport.isPending}
              >
                {(tallyXmlImport.isPending || tallyCsvImport.isPending) ? 'Parsing...' : 'Parse & Import'}
              </Button>
            )}
            {tallyStep === 'preview' && (
              <Button variant="outline" onClick={() => { resetTallyForm(); }}>
                Import Another
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
