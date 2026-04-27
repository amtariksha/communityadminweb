'use client';

import { useState, useMemo, useRef, type FormEvent, type ChangeEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, Plus, BookOpen, Upload, Download, AlertCircle, CheckCircle2, Pencil, FileUp, FileDown } from 'lucide-react';
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
import { formatCurrency, financialDateBounds } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
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
  useTallyCommitImport,
} from '@/hooks';
import type {
  TallyImportParseResult,
  TallyCommitResult,
} from '@/hooks/use-tally-import';
import { useTallyExportPreview, useTallyExport } from '@/hooks/use-tally-export';
import type { TallyExportOptions } from '@/hooks/use-tally-export';
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
                  {formatCurrency(
                    account.current_balance ?? account.opening_balance,
                  )}
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
  // Clamp date inputs to prev FY start → next month end.
  const dateBounds = useMemo(() => financialDateBounds(), []);
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
  const tallyCommitImport = useTallyCommitImport();

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
  // Parse response (import_id + records_parsed) — shown on the
  // preview step so the admin can review before committing.
  const [tallyParseResult, setTallyParseResult] =
    useState<TallyImportParseResult | null>(null);
  // Commit response (records_imported / skipped / errors) — shown on
  // the done step. Tracked separately so the preview step doesn't try
  // to render fields that don't exist until the commit fires.
  const [tallyCommitResult, setTallyCommitResult] =
    useState<TallyCommitResult | null>(null);
  const [tallyStep, setTallyStep] = useState<'input' | 'preview' | 'done'>('input');

  // Per-type commit selection (Phase 1 of the import revamp). Each
  // entity type has two flags — include_new and include_changed —
  // that the operator toggles via checkboxes on the preview step.
  // The whole "type bucket" is omitted from the commit body when its
  // master checkbox is off, which tells the server "skip this type
  // entirely" (vs. "commit but only the new ones").
  const [tallyCommitGroups, setTallyCommitGroups] = useState(true);
  const [tallyCommitGroupsChanged, setTallyCommitGroupsChanged] = useState(true);
  const [tallyCommitLedgers, setTallyCommitLedgers] = useState(true);
  const [tallyCommitLedgersChanged, setTallyCommitLedgersChanged] = useState(true);
  const [tallyCommitVouchers, setTallyCommitVouchers] = useState(true);
  const [tallyCommitVouchersChanged, setTallyCommitVouchersChanged] = useState(true);
  // Force flag — bypasses the file-hash dedupe ("imported same file
  // 2h ago"). Per-voucher hash + edited-locally guards still apply.
  const [tallyForceCommit, setTallyForceCommit] = useState(false);

  // -- Tally export state --
  const [tallyExportDialogOpen, setTallyExportDialogOpen] = useState(false);
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [exportGroups, setExportGroups] = useState(true);
  const [exportLedgers, setExportLedgers] = useState(true);
  const [exportVouchers, setExportVouchers] = useState(true);
  const [exportAuditTrail, setExportAuditTrail] = useState(false);

  const tallyExportOptions: TallyExportOptions = {
    from_date: exportFromDate,
    to_date: exportToDate,
    include_groups: exportGroups,
    include_ledgers: exportLedgers,
    include_vouchers: exportVouchers,
    include_audit_trail: exportAuditTrail,
  };

  const { data: exportPreview } = useTallyExportPreview(tallyExportOptions);
  const tallyExport = useTallyExport();

  function handleTallyExport(): void {
    if (!exportFromDate || !exportToDate) {
      addToast({ title: 'Select date range', variant: 'destructive' });
      return;
    }
    tallyExport.mutate(tallyExportOptions, {
      onSuccess() {
        addToast({ title: 'Tally XML downloaded', variant: 'success' });
        setTallyExportDialogOpen(false);
      },
      onError(err) {
        addToast({ title: 'Export failed', description: friendlyError(err), variant: 'destructive' });
      },
    });
  }

  function resetTallyForm(): void {
    setTallyContent('');
    setTallyCsvType('trial_balance');
    setTallyParseResult(null);
    setTallyCommitResult(null);
    setTallyStep('input');
    setTallyFormat('xml');
    setTallyCommitGroups(true);
    setTallyCommitGroupsChanged(true);
    setTallyCommitLedgers(true);
    setTallyCommitLedgersChanged(true);
    setTallyCommitVouchers(true);
    setTallyCommitVouchersChanged(true);
    setTallyForceCommit(false);
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
            const parsed = data.data;
            setTallyParseResult(parsed);
            setTallyCommitResult(null);
            // Default the per-type checkboxes from the parser's
            // counts: tick a type only if there's something to
            // commit. Operator can untick to skip.
            const c = parsed.counts;
            if (c) {
              setTallyCommitGroups(c.groups > 0);
              setTallyCommitLedgers(c.ledgers > 0);
              setTallyCommitVouchers(c.vouchers > 0);
            }
            // Pre-tick "include changed" by default — re-imports
            // typically want the latest Tally state to win unless
            // the operator explicitly says "only new".
            setTallyCommitGroupsChanged(true);
            setTallyCommitLedgersChanged(true);
            setTallyCommitVouchersChanged(true);
            // If the server flagged a duplicate, default Force off
            // — operator explicitly opts in.
            setTallyForceCommit(false);
            setTallyStep('preview');
            addToast({
              title: parsed.duplicate_of
                ? 'Parsed — same file imported recently'
                : 'Tally XML parsed successfully',
              variant: 'success',
            });
          },
          onError(error) {
            addToast({ title: 'Failed to parse Tally XML', description: friendlyError(error), variant: 'destructive' });
          },
        },
      );
    } else {
      tallyCsvImport.mutate(
        { csv_content: tallyContent, import_type: tallyCsvType },
        {
          onSuccess(data) {
            setTallyParseResult(data.data);
            setTallyCommitResult(null);
            setTallyStep('preview');
            addToast({ title: 'Tally CSV parsed successfully', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to parse Tally CSV', description: friendlyError(error), variant: 'destructive' });
          },
        },
      );
    }
  }

  /**
   * Commit the parsed import — writes the staged records to the DB.
   * Called from the Commit button on the preview step. The preview
   * step is a dry-run; nothing actually changes until this fires.
   */
  function handleTallyCommit(): void {
    if (!tallyParseResult?.import_id) {
      addToast({
        title: 'Nothing to commit',
        description: 'Parse a file first.',
        variant: 'destructive',
      });
      return;
    }
    // Build the per-type selection from the checkboxes. Omit a type
    // entirely when its master checkbox is unticked — that tells
    // the server "skip this type". Including with both flags false
    // would be a no-op anyway, but omitting is clearer in logs.
    const commit: NonNullable<Parameters<typeof tallyCommitImport.mutate>[0]['commit']> = {};
    if (tallyCommitGroups) {
      commit.groups = {
        include_new: true,
        include_changed: tallyCommitGroupsChanged,
      };
    }
    if (tallyCommitLedgers) {
      commit.ledgers = {
        include_new: true,
        include_changed: tallyCommitLedgersChanged,
      };
    }
    if (tallyCommitVouchers) {
      commit.vouchers = {
        include_new: true,
        include_changed: tallyCommitVouchersChanged,
      };
    }
    if (Object.keys(commit).length === 0) {
      addToast({
        title: 'Pick at least one type to import',
        description: 'Tick the checkbox next to Groups, Ledgers, or Vouchers.',
        variant: 'destructive',
      });
      return;
    }
    tallyCommitImport.mutate(
      {
        import_id: tallyParseResult.import_id,
        commit,
        force: tallyForceCommit,
      },
      {
        onSuccess(data) {
          setTallyCommitResult(data.data);
          setTallyStep('done');
          addToast({
            title: `Imported ${data.data.records_imported} records`,
            description:
              (data.data.errors?.length ?? 0) > 0
                ? `${data.data.errors!.length} rows had errors — see details.`
                : undefined,
            variant: 'success',
          });
        },
        onError(error) {
          addToast({
            title: 'Failed to commit import',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
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
            description: friendlyError(error),
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
            description: friendlyError(error),
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
            description: friendlyError(error),
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
        // Match is case-insensitive + trim + matches by code or name to
        // tolerate CSVs exported from Tally (which uses names) as well as
        // code-based imports.
        const needle = code.toLowerCase().trim();
        const matchedAccount = accounts.find(
          (a) =>
            a.code?.toLowerCase().trim() === needle ||
            a.name?.toLowerCase().trim() === needle,
        );

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
          addToast({ title: 'Import failed', description: friendlyError(error), variant: 'destructive' });
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
            <Button variant="outline" onClick={() => setTallyExportDialogOpen(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Export to Tally
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

            {/* Preview step — per-type checkbox grid, classification
                breakdown (new/changed/unchanged/conflict), duplicate-
                file warning, and the Force toggle. Nothing in the DB
                yet — Commit fires the actual writes. */}
            {tallyStep === 'preview' && tallyParseResult && (
              <div className="space-y-4">
                {/* Duplicate-file warning */}
                {tallyParseResult.duplicate_of && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1 flex-1">
                      <p className="font-medium">Same file imported recently</p>
                      <p>
                        This file was committed{' '}
                        {new Date(tallyParseResult.duplicate_of.created_at).toLocaleString()}.
                        The commit endpoint will reject this re-upload unless you tick
                        the Force option below. The per-voucher hash check still applies —
                        unchanged vouchers will be skipped automatically even with Force on.
                      </p>
                    </div>
                  </div>
                )}

                {/* Per-type commit grid */}
                <div className="rounded-md border divide-y">
                  <div className="px-4 py-2 bg-muted/50 text-xs font-medium uppercase tracking-wide flex items-center gap-2">
                    <span className="flex-1">Pick what to import</span>
                    <span className="text-muted-foreground">
                      {tallyParseResult.records_parsed} total parsed
                    </span>
                  </div>
                  {/* Render a row per entity type. The checkbox on
                      the left is the master "commit this type"
                      switch; the sub-checkbox is the
                      "include_changed" guard. */}
                  {([
                    {
                      key: 'groups' as const,
                      label: 'Groups',
                      master: tallyCommitGroups,
                      setMaster: setTallyCommitGroups,
                      changed: tallyCommitGroupsChanged,
                      setChanged: setTallyCommitGroupsChanged,
                      counts: tallyParseResult.counts?.groups ?? 0,
                      cls: tallyParseResult.classification?.groups,
                    },
                    {
                      key: 'ledgers' as const,
                      label: 'Ledgers',
                      master: tallyCommitLedgers,
                      setMaster: setTallyCommitLedgers,
                      changed: tallyCommitLedgersChanged,
                      setChanged: setTallyCommitLedgersChanged,
                      counts: tallyParseResult.counts?.ledgers ?? 0,
                      cls: tallyParseResult.classification?.ledgers,
                    },
                    {
                      key: 'vouchers' as const,
                      label: 'Vouchers (transactions)',
                      master: tallyCommitVouchers,
                      setMaster: setTallyCommitVouchers,
                      changed: tallyCommitVouchersChanged,
                      setChanged: setTallyCommitVouchersChanged,
                      counts: tallyParseResult.counts?.vouchers ?? 0,
                      cls: tallyParseResult.classification?.vouchers,
                    },
                  ]).map((row) => {
                    const empty = row.counts === 0;
                    return (
                      <div key={row.key} className="px-4 py-3 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.master}
                            disabled={empty}
                            onChange={(e) => row.setMaster(e.target.checked)}
                            className="h-4 w-4"
                          />
                          <span className="font-medium text-sm flex-1">
                            {row.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {row.counts} detected
                          </span>
                        </label>
                        {!empty && row.cls && (
                          <div className="ml-6 grid grid-cols-4 gap-2 text-xs">
                            <span>
                              <span className="text-green-600 font-medium">{row.cls.new}</span>{' '}
                              <span className="text-muted-foreground">new</span>
                            </span>
                            <span>
                              <span className="text-blue-600 font-medium">{row.cls.changed}</span>{' '}
                              <span className="text-muted-foreground">changed</span>
                            </span>
                            <span>
                              <span className="text-muted-foreground font-medium">{row.cls.unchanged}</span>{' '}
                              <span className="text-muted-foreground">unchanged</span>
                            </span>
                            <span>
                              <span className={row.cls.conflict > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                                {row.cls.conflict}
                              </span>{' '}
                              <span className="text-muted-foreground">conflict</span>
                            </span>
                          </div>
                        )}
                        {!empty && row.master && row.cls && row.cls.changed > 0 && (
                          <label className="ml-6 flex items-center gap-2 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={row.changed}
                              onChange={(e) => row.setChanged(e.target.checked)}
                              className="h-3.5 w-3.5"
                            />
                            <span>
                              Update {row.cls.changed} changed record{row.cls.changed === 1 ? '' : 's'}
                              {' '}— untick to import only new ones
                            </span>
                          </label>
                        )}
                        {!empty && row.cls && row.cls.conflict > 0 && (
                          <p className="ml-6 text-xs text-amber-600 dark:text-amber-500">
                            {row.cls.conflict} record{row.cls.conflict === 1 ? '' : 's'} edited
                            locally — skipped automatically to preserve your changes.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Force toggle — only meaningful when duplicate flagged */}
                {tallyParseResult.duplicate_of && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tallyForceCommit}
                      onChange={(e) => setTallyForceCommit(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">
                      Force re-import (bypass the same-file-recently-imported guard)
                    </span>
                  </label>
                )}

                <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <p className="font-medium">Ready to import</p>
                    <p>
                      Records are parsed but NOT yet saved. Click{' '}
                      <strong>Import</strong> to commit only the ticked types.
                      Unchanged records are no-ops; conflict-flagged records are
                      preserved.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Done step — per-type disposition breakdown + errors. */}
            {tallyStep === 'done' && tallyCommitResult && (
              <div className="space-y-4">
                <div className="rounded-md border divide-y">
                  <div className="px-4 py-2 bg-muted/50 text-xs font-medium uppercase tracking-wide">
                    Import Result
                  </div>
                  {/* Render a row per type that actually ran */}
                  {(['groups', 'ledgers', 'vouchers'] as const).map((key) => {
                    const r = tallyCommitResult[key];
                    if (!r) return null;
                    const label =
                      key === 'groups'
                        ? 'Groups'
                        : key === 'ledgers'
                        ? 'Ledgers'
                        : 'Vouchers';
                    return (
                      <div key={key} className="px-4 py-3 space-y-1">
                        <div className="flex items-center text-sm font-medium">
                          <span className="flex-1">{label}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.new + r.updated} committed
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <span>
                            <span className="text-green-600 font-medium">{r.new}</span>{' '}
                            <span className="text-muted-foreground">new</span>
                          </span>
                          <span>
                            <span className="text-blue-600 font-medium">{r.updated}</span>{' '}
                            <span className="text-muted-foreground">updated</span>
                          </span>
                          <span>
                            <span className="text-muted-foreground font-medium">{r.unchanged}</span>{' '}
                            <span className="text-muted-foreground">unchanged</span>
                          </span>
                          <span>
                            <span className={r.conflict > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                              {r.conflict}
                            </span>{' '}
                            <span className="text-muted-foreground">conflict</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-4 py-2 text-xs flex items-center gap-4">
                    <span>
                      <strong className="text-green-600">{tallyCommitResult.records_imported}</strong>{' '}
                      <span className="text-muted-foreground">total imported</span>
                    </span>
                    <span>
                      <strong className="text-yellow-600">{tallyCommitResult.records_skipped}</strong>{' '}
                      <span className="text-muted-foreground">skipped</span>
                    </span>
                  </div>
                </div>
                {(tallyCommitResult.errors?.length ?? 0) > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 space-y-1">
                    <h4 className="font-medium text-sm text-red-700 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Errors ({tallyCommitResult.errors!.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {(tallyCommitResult.errors ?? []).map((err, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400">
                          {err}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {tallyCommitResult.records_imported > 0 && (
                  <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Successfully imported {tallyCommitResult.records_imported} records.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                {tallyStep === 'done' ? 'Close' : 'Cancel'}
              </Button>
            </DialogClose>
            {tallyStep === 'input' && (
              <Button
                onClick={handleTallyParse}
                disabled={tallyXmlImport.isPending || tallyCsvImport.isPending}
              >
                {(tallyXmlImport.isPending || tallyCsvImport.isPending) ? 'Parsing...' : 'Parse'}
              </Button>
            )}
            {tallyStep === 'preview' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTallyParseResult(null);
                    setTallyStep('input');
                  }}
                  disabled={tallyCommitImport.isPending}
                >
                  Back
                </Button>
                <Button
                  onClick={handleTallyCommit}
                  disabled={tallyCommitImport.isPending}
                >
                  {tallyCommitImport.isPending ? 'Importing...' : 'Import'}
                </Button>
              </>
            )}
            {tallyStep === 'done' && (
              <Button variant="outline" onClick={() => { resetTallyForm(); }}>
                Import Another
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tally Export Dialog */}
      <Dialog open={tallyExportDialogOpen} onOpenChange={setTallyExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export to Tally</DialogTitle>
            <DialogDescription>Generate a Tally-compatible XML file for import</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="export-from">From Date *</Label>
                <Input
                  id="export-from"
                  type="date"
                  min={dateBounds.min}
                  max={dateBounds.max}
                  value={exportFromDate}
                  onChange={(e) => setExportFromDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="export-to">To Date *</Label>
                <Input
                  id="export-to"
                  type="date"
                  min={dateBounds.min}
                  max={dateBounds.max}
                  value={exportToDate}
                  onChange={(e) => setExportToDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label>Include</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportGroups}
                    onChange={(e) => setExportGroups(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Account Groups
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportLedgers}
                    onChange={(e) => setExportLedgers(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Ledger Accounts
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportVouchers}
                    onChange={(e) => setExportVouchers(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Vouchers
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportAuditTrail}
                    onChange={(e) => setExportAuditTrail(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Include audit trail
                </label>
              </div>
            </div>
            {exportPreview && exportFromDate && exportToDate && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium mb-2">Preview</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{exportPreview.groups_count}</p>
                    <p className="text-xs text-muted-foreground">Groups</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{exportPreview.ledgers_count}</p>
                    <p className="text-xs text-muted-foreground">Ledgers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{exportPreview.vouchers_count}</p>
                    <p className="text-xs text-muted-foreground">Vouchers</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleTallyExport}
              disabled={tallyExport.isPending || !exportFromDate || !exportToDate}
            >
              <Download className="mr-2 h-4 w-4" />
              {tallyExport.isPending ? 'Exporting...' : 'Download XML'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
