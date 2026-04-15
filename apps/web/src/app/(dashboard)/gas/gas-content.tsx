'use client';

import { useState, type ReactNode } from 'react';
import { Flame, Wallet, ArrowDownUp, Plus } from 'lucide-react';
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
import {
  useGasPlans,
  useGasWallets,
  useGasTransactions,
  useGasStats,
  useCreateGasPlan,
  useRechargeWallet,
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

// ---------------------------------------------------------------------------
// Tab constants
// ---------------------------------------------------------------------------

type Tab = 'plans' | 'wallets' | 'transactions';

const TABS: { key: Tab; label: string }[] = [
  { key: 'plans', label: 'Plans' },
  { key: 'wallets', label: 'Wallets' },
  { key: 'transactions', label: 'Transactions' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GasContent(): ReactNode {
  const [activeTab, setActiveTab] = useState<Tab>('plans');

  const statsQuery = useGasStats();
  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Gas Management' }]}
        title="Gas Management"
        description="Manage piped gas plans, wallets, and consumption"
      />

      {/* Stat cards */}
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
                <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_plans ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Wallets</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.active_wallets ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recharged</CardTitle>
                <ArrowDownUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.total_recharged ?? 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Consumed</CardTitle>
                <Flame className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_consumed ?? 0}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'plans' && <PlansTab />}
      {activeTab === 'wallets' && <WalletsTab />}
      {activeTab === 'transactions' && <TransactionsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plans Tab
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
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gas Plans</CardTitle>
          <Button onClick={() => setCreateOpen(true)}>
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
                  No gas plans found. Create one to get started.
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
// Wallets Tab
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
            description: error.message,
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
// Transactions Tab
// ---------------------------------------------------------------------------

function TransactionsTab(): ReactNode {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          <div className="flex items-center gap-3">
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
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
