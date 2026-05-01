'use client';

import { useState, type ReactNode } from 'react';
import {
  Flame,
  Wallet,
  ArrowDownUp,
  Plus,
  Clock,
  CheckCircle2,
  IndianRupee,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useGasPlans,
  useGasWallets,
  useGasTransactions,
  useGasStats,
  useCreateGasPlan,
  useRechargeWallet,
  usePendingRecharges,
  useDispenseRecharge,
} from '@/hooks/use-gas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function txnTypeVariant(
  type: string,
): 'success' | 'default' | 'warning' | 'secondary' {
  switch (type) {
    case 'recharge':
      return 'success';
    case 'dispense':
      return 'default';
    case 'refund':
      return 'warning';
    default:
      return 'secondary';
  }
}

function rechargeStatusVariant(
  status: string,
): 'success' | 'default' | 'warning' | 'secondary' | 'destructive' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'dispensed':
      return 'success';
    case 'cancelled':
      return 'destructive';
    case 'refunded':
      return 'secondary';
    default:
      return 'secondary';
  }
}

// ---------------------------------------------------------------------------
// Tab constants
// ---------------------------------------------------------------------------
//
// Order reflects the new physical-card flow shipped in QA #107:
// the resident pays via the app and shows the payment at the gate
// for the gas card to be recharged. The "Pending Recharges" tab
// is therefore the security desk's primary work surface and opens
// by default. "Recharges" history follows. "Wallets" + "Plans" are
// the legacy virtual-wallet system, kept for accounting visibility
// but demoted to the right.

type Tab = 'pending-recharges' | 'recharges' | 'wallets' | 'plans';

const TABS: { key: Tab; label: string; legacy?: boolean }[] = [
  { key: 'pending-recharges', label: 'Pending Recharges' },
  { key: 'recharges', label: 'Recharge History' },
  { key: 'wallets', label: 'Wallets', legacy: true },
  { key: 'plans', label: 'Plans', legacy: true },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GasContent(): ReactNode {
  const [activeTab, setActiveTab] = useState<Tab>('pending-recharges');

  const statsQuery = useGasStats();
  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Gas Management' }]}
        title="Gas Management"
        description="Resident-paid gas card recharges awaiting dispense at the security desk"
      />

      {/* Stat cards — reoriented around the new physical-card flow.
          Pending count is the headline metric (admin's daily work
          queue); the legacy total_balance fields are not surfaced
          here anymore. */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Recharges
                </CardTitle>
                <Clock
                  className={
                    (stats?.pending_recharges_count ?? 0) > 0
                      ? 'h-4 w-4 text-amber-500'
                      : 'h-4 w-4 text-muted-foreground'
                  }
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.pending_recharges_count ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.pending_recharges_amount ?? 0)} awaiting
                  dispense
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Recharged Today
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.recharged_today_amount ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Resident-paid today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Dispensed Today
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.dispensed_today_count ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cards handed out today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Wallets
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.total_wallets ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Legacy virtual wallets
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.key === 'pending-recharges' &&
            (stats?.pending_recharges_count ?? 0) > 0 ? (
              <Badge variant="warning" className="ml-1">
                {stats?.pending_recharges_count}
              </Badge>
            ) : null}
            {tab.legacy ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                Legacy
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === 'pending-recharges' && <RechargesTab defaultStatus="pending" />}
      {activeTab === 'recharges' && <RechargesTab defaultStatus="all" />}
      {activeTab === 'wallets' && <WalletsTab />}
      {activeTab === 'plans' && <PlansTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recharges Tab (QA #107-admin) — the primary work surface
// ---------------------------------------------------------------------------
//
// Lists rows from `gas_recharge_payments` produced by the resident
// app's "pay for gas" flow. Default status filter is 'pending'
// when the tab opens from the Pending Recharges entry-point;
// 'all' when opened from the Recharge History entry-point. Both
// share this component so dispensing from history (e.g. an admin
// scrolling the audit log) Just Works.
//
// Backend now JOINs users + units, so we render real names and
// flat numbers instead of UUID slices. "Mark Dispensed" still
// calls PATCH /gas/recharges/:id/dispense; the backend stamps
// dispensed_by_user_id + dispensed_at and refuses non-pending
// rows (so the button is hidden for non-pending statuses).

interface RechargesTabProps {
  defaultStatus: 'pending' | 'all';
}

function RechargesTab({ defaultStatus }: RechargesTabProps): ReactNode {
  const { addToast } = useToast();
  const [status, setStatus] = useState<string>(defaultStatus);
  const rechargesQuery = usePendingRecharges(status);
  const dispense = useDispenseRecharge();

  const recharges = rechargesQuery.data ?? [];

  function handleDispense(id: string): void {
    dispense.mutate(id, {
      onSuccess() {
        addToast({ title: 'Recharge dispensed', variant: 'success' });
      },
      onError(error) {
        addToast({
          title: 'Failed to mark dispensed',
          description: friendlyError(error),
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>
              {defaultStatus === 'pending'
                ? 'Pending Recharges'
                : 'Recharge History'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {defaultStatus === 'pending'
                ? 'Resident-paid recharges waiting to be dispensed at the gate'
                : 'Every recharge ever — pending, dispensed, cancelled, refunded'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="status-filter" className="text-xs">
              Status
            </Label>
            <Select
              id="status-filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="dispensed">Dispensed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="all">All</option>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resident</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paid At</TableHead>
              <TableHead>Razorpay Payment</TableHead>
              <TableHead>Dispensed</TableHead>
              <TableHead className="w-32">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rechargesQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : recharges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  {status === 'pending'
                    ? 'No pending recharges. Everything dispensed!'
                    : 'No recharges in this view.'}
                </TableCell>
              </TableRow>
            ) : (
              recharges.map((row) => {
                const isPending = row.status === 'pending';
                const isDispensingThis =
                  dispense.isPending && dispense.variables === row.id;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <div>{row.resident_name ?? '—'}</div>
                      {row.resident_phone ? (
                        <div className="text-xs text-muted-foreground">
                          {row.resident_phone}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {row.unit_number ?? row.unit_id.slice(0, 8)}
                      {row.block ? (
                        <span className="text-muted-foreground">
                          {' '}
                          · Block {row.block}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(row.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={rechargeStatusVariant(row.status)}
                        className="capitalize"
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.razorpay_payment_id ??
                        (row.razorpay_order_id ? (
                          <span title="Order minted, payment pending">
                            order: {row.razorpay_order_id.slice(-8)}
                          </span>
                        ) : (
                          '—'
                        ))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.dispensed_at ? (
                        <>
                          <div>{formatDate(row.dispensed_at)}</div>
                          {row.dispensed_by_name ? (
                            <div>by {row.dispensed_by_name}</div>
                          ) : null}
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {isPending ? (
                        <Button
                          size="sm"
                          onClick={() => handleDispense(row.id)}
                          disabled={isDispensingThis}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          {isDispensingThis ? 'Dispensing…' : 'Mark Dispensed'}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Wallets Tab (legacy)
// ---------------------------------------------------------------------------

function WalletsTab(): ReactNode {
  const { addToast } = useToast();
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [selectedWalletUnitId, setSelectedWalletUnitId] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');

  const walletsQuery = useGasWallets();
  const rechargeMutation = useRechargeWallet();
  const wallets = walletsQuery.data ?? [];

  function openRecharge(unitId: string): void {
    setSelectedWalletUnitId(unitId);
    setRechargeAmount('');
    setRechargeOpen(true);
  }

  function handleRecharge(): void {
    if (!rechargeAmount || Number(rechargeAmount) <= 0) {
      addToast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    rechargeMutation.mutate(
      { unit_id: selectedWalletUnitId, amount: Number(rechargeAmount) },
      {
        onSuccess() {
          addToast({ title: 'Wallet recharged', variant: 'success' });
          setRechargeOpen(false);
          setSelectedWalletUnitId('');
          setRechargeAmount('');
        },
        onError(error) {
          addToast({
            title: 'Recharge failed',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gas Wallets</CardTitle>
        <p className="text-sm text-muted-foreground">
          Legacy virtual-wallet ledger. Most communities now use the
          physical card flow above; this view is kept for accounting
          visibility on tenants that still consume from the virtual
          wallet.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Total Recharged</TableHead>
              <TableHead>Total Consumed</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {walletsQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : wallets.length > 0 ? (
              wallets.map((wallet) => (
                <TableRow key={wallet.id}>
                  <TableCell className="font-medium">{wallet.unit_number}</TableCell>
                  <TableCell>{formatCurrency(wallet.balance)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCurrency(wallet.total_recharged)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCurrency(wallet.total_consumed)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRecharge(wallet.unit_id)}
                    >
                      Recharge
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No gas wallets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Inline transactions list — useful when reviewing a
            wallet's history without navigating to a separate tab.
            Mirrors the old standalone Transactions tab. */}
        <div className="mt-6">
          <TransactionsList />
        </div>
      </CardContent>

      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recharge Wallet</DialogTitle>
            <DialogDescription>Add balance to the gas wallet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recharge-amount">Amount (INR)</Label>
              <Input
                id="recharge-amount"
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="e.g. 1000"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleRecharge} disabled={rechargeMutation.isPending}>
              {rechargeMutation.isPending ? 'Recharging...' : 'Recharge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Plans Tab (legacy)
// ---------------------------------------------------------------------------

function PlansTab(): ReactNode {
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planQuantity, setPlanQuantity] = useState('');

  const plansQuery = useGasPlans();
  const createMutation = useCreateGasPlan();
  const plans = plansQuery.data ?? [];

  function handleCreate(): void {
    if (!planName.trim() || !planAmount || !planQuantity) {
      addToast({ title: 'All fields are required', variant: 'destructive' });
      return;
    }

    createMutation.mutate(
      {
        name: planName.trim(),
        amount: Number(planAmount),
        gas_units: Number(planQuantity),
      },
      {
        onSuccess() {
          addToast({ title: 'Plan created', variant: 'success' });
          setCreateOpen(false);
          setPlanName('');
          setPlanAmount('');
          setPlanQuantity('');
        },
        onError(error) {
          addToast({
            title: 'Failed to create plan',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              Gas Plans
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Legacy fixed-amount plans for the virtual-wallet flow.
              The new physical-card flow lets residents enter any
              amount, so most communities no longer maintain plans.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Create Plan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Unit Quantity</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plansQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : plans.length > 0 ? (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{formatCurrency(plan.amount)}</TableCell>
                  <TableCell>{plan.gas_units}</TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? 'success' : 'secondary'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No gas plans found. The new physical-card flow doesn&rsquo;t
                  require plans.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Gas Plan</DialogTitle>
            <DialogDescription>Define a new gas recharge plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. Monthly Basic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-amount">Amount (INR)</Label>
              <Input
                id="plan-amount"
                type="number"
                value={planAmount}
                onChange={(e) => setPlanAmount(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-quantity">Unit Quantity</Label>
              <Input
                id="plan-quantity"
                type="number"
                value={planQuantity}
                onChange={(e) => setPlanQuantity(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Transactions list (inlined under Wallets — legacy virtual-wallet flow)
// ---------------------------------------------------------------------------

function TransactionsList(): ReactNode {
  const [typeFilter, setTypeFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');

  const txnQuery = useGasTransactions({
    type: typeFilter || undefined,
    unit_id: unitFilter || undefined,
  });
  const walletsQuery = useGasWallets();
  const transactions = txnQuery.data?.data ?? [];
  const wallets = walletsQuery.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          Wallet Transactions
        </h3>
        <div className="flex items-center gap-2">
          <Select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            <option value="">All Units</option>
            {wallets.map((w) => (
              <option key={w.unit_id} value={w.unit_id}>
                {w.unit_number}
              </option>
            ))}
          </Select>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="recharge">Recharge</option>
            <option value="dispense">Dispense</option>
            <option value="refund">Refund</option>
          </Select>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unit</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {txnQuery.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : transactions.length > 0 ? (
            transactions.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell className="font-medium">{txn.unit_number}</TableCell>
                <TableCell>
                  <Badge variant={txnTypeVariant(txn.type)} className="capitalize">
                    {txn.type}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(txn.amount)}</TableCell>
                <TableCell>{txn.quantity}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(txn.created_at)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                No transactions found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
