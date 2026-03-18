'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, Plus, BookOpen } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useAccountGroups,
  useLedgerAccounts,
  useFinancialYears,
  useCreateAccountGroup,
  useCreateLedgerAccount,
  useSetOpeningBalance,
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

  const isLoading = groupsLoading || accountsLoading;
  const accounts = accountsResponse?.data ?? [];
  const tree = groups && accounts.length >= 0 ? buildTree(groups, accounts) : [];
  const currentFY = financialYears?.find((fy) => fy.is_current);

  // -- form state for create group --
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [groupParentId, setGroupParentId] = useState('');
  const [groupType, setGroupType] = useState<AccountType>('asset');

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

  // Build a flat list of groups for the select dropdowns
  const flatGroups = groups ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        description={
          currentFY
            ? `Financial Year: ${currentFY.label}`
            : 'Manage your account groups and ledger accounts'
        }
        actions={
          <>
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
                      <Label htmlFor="group-parent">Parent Group</Label>
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
                      <Select
                        id="account-group"
                        value={accountGroupId}
                        onChange={(e) => setAccountGroupId(e.target.value)}
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
