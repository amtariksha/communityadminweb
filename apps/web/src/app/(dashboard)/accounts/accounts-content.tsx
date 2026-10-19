'use client';

import { useState, useMemo, useEffect, type FormEvent, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, BookOpen, FileUp, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
import { JournalEntryDialog } from './journal-entry-dialog';
import { AddAccountGroupDialog, EditAccountGroupDialog, InlineAccountGroupDialog } from './account-group-dialogs';
import { ImportBalancesDialog } from './import-balances-dialog';
import { buildTree, TreeNodeView, TreeSkeleton } from './accounts-tree';
import { TallyExportDialog } from './tally-export-dialog';
import { TallyImportDialog } from './tally-import-dialog';
import { ExportButton } from '@/components/ui/export-button';
import { financialDateBounds } from '@/lib/utils';
// QA #284 — hierarchical XLS export that mirrors the on-screen tree.
import { downloadHierarchicalCoa } from '@/lib/coa-export';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useAccountGroups,
  useLedgerAccounts,
  useFinancialYears,
  useSetCurrentYear,
  useCreateLedgerAccount,
  useUpdateLedgerAccount,
  useSetOpeningBalance,
} from '@/hooks';
import type { AccountGroup, LedgerAccount } from '@communityos/shared';
import { HsnSacField } from './hsn-sac-field';

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AccountsContent(): ReactNode {
  const { addToast } = useToast();
  // Clamp date inputs to prev FY start → next month end.
  const dateBounds = useMemo(() => financialDateBounds(), []);
  // Free-form Journal Entry dialog. Backend was always there
  // (POST /ledger/journal-entries); this is the missing UI.
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const { data: groups, isLoading: groupsLoading } = useAccountGroups();
  const { data: accountsResponse, isLoading: accountsLoading } = useLedgerAccounts({ limit: 500 });
  const { data: financialYears } = useFinancialYears();
  const setCurrentYear = useSetCurrentYear();

  const createAccount = useCreateLedgerAccount();
  const updateAccount = useUpdateLedgerAccount();
  const setOpeningBalance = useSetOpeningBalance();

  const isLoading = groupsLoading || accountsLoading;
  const accounts = accountsResponse?.data ?? [];
  const tree = groups && accounts.length >= 0 ? buildTree(groups, accounts) : [];
  const currentFY = financialYears?.find((fy) => fy.is_current);

  // Tally import and export are their own dialogs (GL-12).
  const [tallyDialogOpen, setTallyDialogOpen] = useState(false);
  const [tallyExportDialogOpen, setTallyExportDialogOpen] = useState(false);

  // -- inline create group dialog (inside create account) --
  const [inlineGroupDialogOpen, setInlineGroupDialogOpen] = useState(false);

  // -- form state for create account --
  const [accountName, setAccountName] = useState('');
  const [accountCode, setAccountCode] = useState('');
  // EXP-19 — HSN/SAC of an expense head ('' = none).
  const [accountHsn, setAccountHsn] = useState('');
  const [accountGroupId, setAccountGroupId] = useState('');
  const [openingBalance, setOpeningBalanceValue] = useState('0');
  const [balanceType, setBalanceType] = useState('debit');

  // -- edit group dialog state --
  const [editingGroup, setEditingGroup] = useState<AccountGroup | null>(null);

  // -- edit account dialog state --
  const [editAccountDialogOpen, setEditAccountDialogOpen] = useState(false);
  const [editAccountId, setEditAccountId] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountCode, setEditAccountCode] = useState('');
  const [editAccountHsn, setEditAccountHsn] = useState('');
  const [editAccountGroupId, setEditAccountGroupId] = useState('');
  const [editAccountOpeningBalance, setEditAccountOpeningBalance] = useState('0');
  const [editAccountBalanceType, setEditAccountBalanceType] = useState('debit');



  // General Ledger › Bulk Posting links here with ?import=tally (GL-09):
  // open the Tally import once, then drop the parameter.
  const importParam = useSearchParams()?.get('import') ?? null;
  const router = useRouter();
  useEffect(() => {
    if (importParam !== 'tally') return;
    setTallyDialogOpen(true);
    router.replace('/accounts');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importParam]);

  function resetAccountForm(): void {
    setAccountName('');
    setAccountCode('');
    setAccountHsn('');
    setAccountGroupId('');
    setOpeningBalanceValue('0');
    setBalanceType('debit');
  }

  function handleOpenEditAccount(account: LedgerAccount): void {
    setEditAccountId(account.id);
    setEditAccountName(account.name);
    setEditAccountCode(account.code);
    setEditAccountHsn(account.hsn_sac ?? '');
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
          hsn_sac: editAccountHsn.trim() || null,
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
            description: friendlyError(error),
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
        ...(accountHsn.trim() ? { hsn_sac: accountHsn.trim() } : {}),
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
            description: friendlyError(error),
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
        breadcrumbs={[{ label: 'Accounts' }]}
        title="Chart of Accounts"
        // Inline FY picker — `currentFY` drives every FY-scoped query
        // and report across the app (it reads `is_current` from
        // financial_years). Changing it here flips the tenant-wide
        // current-year via useSetCurrentYear; the surrounding queries
        // invalidate and refresh automatically.
        description={
          financialYears && financialYears.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Financial Year:</span>
              <select
                value={currentFY?.id ?? ''}
                disabled={setCurrentYear.isPending}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id || id === currentFY?.id) return;
                  setCurrentYear.mutate(id);
                }}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Switch financial year"
              >
                {!currentFY && <option value="">Pick FY</option>}
                {financialYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>
                    {fy.label}
                    {fy.is_frozen ? ' — frozen' : ''}
                  </option>
                ))}
              </select>
              {setCurrentYear.isPending && (
                <span className="text-[11px] text-muted-foreground">
                  Switching…
                </span>
              )}
            </div>
          ) : (
            'Manage your account groups and ledger accounts'
          )
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setTallyDialogOpen(true)}>
              <FileUp className="mr-2 h-4 w-4" />
              Import from Tally
            </Button>
            <Button variant="outline" onClick={() => setTallyExportDialogOpen(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Export to Tally
            </Button>
            <Button variant="outline" onClick={() => setJournalDialogOpen(true)}>
              <BookOpen className="mr-2 h-4 w-4" />
              New Journal Entry
            </Button>
            <ExportButton
              data={accounts as unknown as Record<string, unknown>[]}
              filename={`accounts-${new Date().toISOString().split('T')[0]}`}
              // QA #260 — adds the parent column the Tally / audit
              // committee expect on a COA dump. The backend now ships
              // `parent_group_name` + `parent_group_code` alongside
              // `group_name` so the export captures the full
              // Account → Group → Parent Group hierarchy.
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Account Name' },
                { key: 'group_name', label: 'Group' },
                { key: 'parent_group_code', label: 'Parent Group Code' },
                { key: 'parent_group_name', label: 'Parent Group' },
                { key: 'opening_balance', label: 'Opening Balance' },
                { key: 'balance_type', label: 'Balance Type' },
              ]}
            />
            {/* 2026-05-09 (QA #284) — flat CSV/Excel above loses the
                parent → child structure shown on screen. This new
                action emits a styled XLS that mirrors the tree:
                bold group headers, indented account rows, type
                pills. See `apps/web/src/lib/coa-export.ts`. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadHierarchicalCoa(tree, {
                  filename: `chart-of-accounts-${new Date().toISOString().split('T')[0]}`,
                  societyLabel: currentFY?.label
                    ? `Financial Year: ${currentFY.label}`
                    : undefined,
                });
              }}
              title="Excel export preserving the on-screen tree"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export Tree (XLS)
            </Button>
            <AddAccountGroupDialog groups={flatGroups} />

            <ImportBalancesDialog accounts={accounts} />

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
                    <HsnSacField id="account-hsn" value={accountHsn} onChange={setAccountHsn} />
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
                              {g.name}
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
                        <InlineAccountGroupDialog
                          open={inlineGroupDialogOpen}
                          onOpenChange={setInlineGroupDialogOpen}
                          groups={flatGroups}
                          onCreated={(group) => setAccountGroupId(group.id)}
                        />
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
                  onEditGroup={setEditingGroup}
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

      <EditAccountGroupDialog group={editingGroup} onClose={() => setEditingGroup(null)} />

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
              <HsnSacField id="edit-account-hsn" value={editAccountHsn} onChange={setEditAccountHsn} />
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
                      {g.name}
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

      <TallyImportDialog open={tallyDialogOpen} onOpenChange={setTallyDialogOpen} />

      {/* Manual Journal Entry — backend always supported it; this is
          the new UI surface that lets the accountant post a free-form
          DR/CR balanced entry without going through the
          invoice/receipt/bill templates. */}
      <JournalEntryDialog
        open={journalDialogOpen}
        onOpenChange={setJournalDialogOpen}
      />

      <TallyExportDialog open={tallyExportDialogOpen} onOpenChange={setTallyExportDialogOpen} />

    </div>
  );
}
