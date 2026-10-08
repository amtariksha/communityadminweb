'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Percent,
  FileText,
  Receipt,
  Users,
  GripVertical,
  Building2,
  Ticket,
  Footprints,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/layout/page-header';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { TOOLTIP } from '@/lib/tooltip-content';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  useDashboardData,
  useIncomeExpenditure,
  useCountsSummary,
  useTicketsSummary,
  useStatisticsSummary,
} from '@/hooks';

function getMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startDate = start.toISOString().split('T')[0];
  return { startDate, endDate };
}

function StatCardSkeleton(): ReactNode {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

type TransactionRow = {
  id: string;
  date: string;
  description: string;
  type: 'Invoice' | 'Receipt';
  amount: number;
  status: string;
};

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'secondary' {
  switch (status) {
    case 'completed':
    case 'paid':
      return 'success';
    case 'pending':
    case 'partially_paid':
    case 'overdue':
      return 'warning';
    default:
      return 'secondary';
  }
}

export default function DashboardContent(): ReactNode {
  const { data: dashboard, isLoading } = useDashboardData();
  const { startDate, endDate } = getMonthRange();
  const { data: incomeExpenditure } = useIncomeExpenditure(startDate, endDate);

  // QA #58 / #59 / #244 — Income / Expenses / Collection now derive
  // from accounting-layer truth instead of:
  //   - receipt_summary.total_collected (a key that never existed
  //     on the array response from /receipts/summary)
  //   - SUM(trial_balance.total_debit) over EVERY account (which
  //     mixes asset/expense/drawings — economically meaningless)
  // Now: Income & Expenses come from the income-expenditure report,
  // which already filters to ag.type IN ('income', 'expense').
  // Collection Rate uses receipts collected vs (collected + outstanding).
  const totalIncome = dashboard?.income_expenditure?.total_income ?? 0;
  const totalExpenses = dashboard?.income_expenditure?.total_expenditure ?? 0;
  const outstandingDues = dashboard?.defaulter_summary?.total_overdue_amount ?? 0;
  const totalCollected = dashboard?.receipt_summary?.total_collected ?? 0;

  // Collection rate compares actual receipts received vs. what
  // SHOULD have been collected (receipts + overdue). totalIncome
  // is a P&L-side number; it isn't the right denominator for
  // collection-rate UX, which is cash-basis.
  const billedTotal = totalCollected + outstandingDues;
  const collectionRate = billedTotal > 0 ? (totalCollected / billedTotal) * 100 : 0;

  const incomeArr = incomeExpenditure?.income ?? [];
  const expenditureArr = incomeExpenditure?.expenditure ?? [];

  const chartData = incomeArr.map((inc) => {
    const matchingExpense = expenditureArr.find(
      (exp) => exp.account_id === inc.account_id,
    );
    return {
      name: inc.account_name,
      income: inc.amount,
      expenses: matchingExpense?.amount ?? 0,
    };
  });

  const recentInvoices = dashboard?.recent_invoices ?? [];
  const recentReceipts = dashboard?.recent_receipts ?? [];

  const recentTransactions: TransactionRow[] = [
    ...recentInvoices.map((inv) => ({
      id: inv.id,
      date: String(inv.invoice_date),
      description: `Invoice ${inv.invoice_number}`,
      type: 'Invoice' as const,
      amount: -inv.total_amount,
      status: inv.status,
    })),
    ...recentReceipts.map((rct) => ({
      id: rct.id,
      date: String(rct.receipt_date),
      description: `Receipt ${rct.receipt_number}`,
      type: 'Receipt' as const,
      amount: rct.amount,
      status: 'completed',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
   .slice(0, 10);

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('dashboard_widget_order');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return ['stats', 'cashflow', 'breakdowns', 'transactions'];
  });

  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedWidget(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedWidget || draggedWidget === targetId) return;
    const current = [...widgetOrder];
    const fromIdx = current.indexOf(draggedWidget);
    const toIdx = current.indexOf(targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
      current.splice(fromIdx, 1);
      current.splice(toIdx, 0, draggedWidget);
      setWidgetOrder(current);
      try {
        localStorage.setItem('dashboard_widget_order', JSON.stringify(current));
      } catch {}
    }
    setDraggedWidget(null);
  };

  const { data: counts } = useCountsSummary();
  const { data: ticketSummary } = useTicketsSummary();
  const { data: stats } = useStatisticsSummary();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Dashboard" description="Overview of your society finances and operations" />
        <Link href="/kpi-dashboard">
          <Button variant="default" size="sm" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Operational KPI Command Center →
          </Button>
        </Link>
      </div>

      {widgetOrder.map((widgetId) => {
        if (widgetId === 'stats') {
          return (
            <div
              key="stats"
              draggable
              onDragStart={() => handleDragStart('stats')}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop('stats')}
              className="relative group border border-transparent hover:border-dashed hover:border-muted-foreground/30 p-1 rounded-xl transition-all"
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground z-10">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {isLoading ? (
                  <>
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                  </>
                ) : (
                  <>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-1">
                          Total Income
                          <HelpTooltip text={TOOLTIP.dashboard.income} side="bottom" />
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-success" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
                        <p className="text-xs text-muted-foreground">
                          {dashboard?.receipt_summary?.count ?? 0} receipts collected
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-1">
                          Total Expenses
                          <HelpTooltip text={TOOLTIP.dashboard.expenses} side="bottom" />
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                        <p className="text-xs text-muted-foreground">Posted to expense accounts this FY</p>
                      </CardContent>
                    </Card>

                    <Link
                      href="/invoices?filter=defaulters"
                      className="rounded-lg transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`View ${dashboard?.defaulter_summary.total_defaulters ?? 0} defaulters with ${formatCurrency(outstandingDues)} outstanding`}
                    >
                      <Card className="cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-1">
                            Outstanding Dues
                            <HelpTooltip text={TOOLTIP.dashboard.outstanding} side="bottom" />
                          </CardTitle>
                          <AlertCircle className="h-4 w-4 text-warning" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(outstandingDues)}</div>
                          <p className="text-xs text-muted-foreground">
                            {dashboard?.defaulter_summary.total_defaulters ?? 0} defaulters →
                          </p>
                        </CardContent>
                      </Card>
                    </Link>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-1">
                          Collection Rate
                          <HelpTooltip text={TOOLTIP.dashboard.collectionRate} side="bottom" />
                        </CardTitle>
                        <Percent className="h-4 w-4 text-primary" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{collectionRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Based on receipts vs invoiced</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          );
        }

        if (widgetId === 'cashflow') {
          return (
            <div
              key="cashflow"
              draggable
              onDragStart={() => handleDragStart('cashflow')}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop('cashflow')}
              className="relative group border border-transparent hover:border-dashed hover:border-muted-foreground/30 p-1 rounded-xl transition-all"
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground z-10">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Income vs Expenses</CardTitle>
                    <CardDescription>Account-wise breakdown for current period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      {isLoading ? (
                        <Skeleton className="h-full w-full" />
                      ) : chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="name" className="text-xs" />
                            <YAxis
                              className="text-xs"
                              tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{
                                backgroundColor: 'var(--color-card)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '0.375rem',
                              }}
                            />
                            <Legend />
                            <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No data available for the selected period
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                    <CardDescription>Frequently used actions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/invoices">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <FileText className="h-4 w-4" />
                        Generate Invoices
                      </Button>
                    </Link>
                    <Link href="/receipts">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Receipt className="h-4 w-4" />
                        Record Receipt
                      </Button>
                    </Link>
                    <Link href="/vendors">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Users className="h-4 w-4" />
                        Add Vendor
                      </Button>
                    </Link>
                    <Link href="/payments">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <IndianRupee className="h-4 w-4" />
                        Record Payment
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        }

        if (widgetId === 'breakdowns') {
          return (
            <div
              key="breakdowns"
              draggable
              onDragStart={() => handleDragStart('breakdowns')}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop('breakdowns')}
              className="relative group border border-transparent hover:border-dashed hover:border-muted-foreground/30 p-1 rounded-xl transition-all"
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground z-10">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Tower Occupancy Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      Block Occupancy
                    </CardTitle>
                    <CardDescription>Units per tower/wing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!counts?.blocks || counts.blocks.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No blocks registered</p>
                    ) : (
                      <div className="space-y-2">
                        {counts.blocks.slice(0, 4).map((b) => (
                          <div key={b.block} className="flex items-center justify-between text-xs">
                            <span className="font-medium">{b.block}</span>
                            <span className="text-muted-foreground">
                              {b.occupied_flats} / {b.total_flats} occupied
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Ticket Workload Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-amber-500" />
                      Helpdesk Queue
                    </CardTitle>
                    <CardDescription>Top active categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!ticketSummary?.categories || ticketSummary.categories.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No active tickets</p>
                    ) : (
                      <div className="space-y-2">
                        {ticketSummary.categories.slice(0, 4).map((c) => (
                          <div key={c.category} className="flex items-center justify-between text-xs">
                            <span className="font-medium truncate max-w-[120px]">{c.category}</span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-xs">{c.open_count} open</Badge>
                              {c.breached_count > 0 && (
                                <Badge variant="destructive" className="text-xs">{c.breached_count} SLA</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Daily Gate Footfall */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Footprints className="h-4 w-4 text-cyan-500" />
                      Gate Footfall
                    </CardTitle>
                    <CardDescription>Recent visitor traffic</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!stats?.dailyFootfall || stats.dailyFootfall.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No footfall recorded</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.dailyFootfall.slice(-4).map((f) => (
                          <div key={f.date} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{formatDate(f.date)}</span>
                            <span className="font-semibold">{f.visitors_count} visitors</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        }

        if (widgetId === 'transactions') {
          return (
            <div
              key="transactions"
              draggable
              onDragStart={() => handleDragStart('transactions')}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop('transactions')}
              className="relative group border border-transparent hover:border-dashed hover:border-muted-foreground/30 p-1 rounded-xl transition-all"
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground z-10">
                <GripVertical className="h-4 w-4" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Transactions</CardTitle>
                  <CardDescription>Latest financial activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableSkeleton />
                      ) : recentTransactions.length > 0 ? (
                        recentTransactions.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell className="text-muted-foreground">
                              {formatDate(txn.date)}
                            </TableCell>
                            <TableCell className="font-medium">{txn.description}</TableCell>
                            <TableCell>
                              <Badge variant={txn.type === 'Receipt' ? 'success' : 'secondary'}>
                                {txn.type}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${txn.amount >= 0 ? 'text-success' : 'text-destructive'}`}
                            >
                              {formatCurrency(Math.abs(txn.amount))}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(txn.status)}>
                                {txn.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                            No recent transactions
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
