'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import {
  Building2,
  Ticket,
  Boxes,
  Wrench,
  FileText,
  Receipt,
  ShieldAlert,
  Footprints,
  Car,
  CalendarCheck,
  UserCheck,
  Tags,
  AlertTriangle,
  Wallet,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Percent,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { formatCurrency } from '@/lib/utils';
import {
  useKpiDashboardData,
  useCountsSummary,
  useTicketsSummary,
  useStatisticsSummary,
} from '@/hooks';

const PIE_COLORS = ['#10b981', '#6b7280', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function KpiDashboardContent(): ReactNode {
  const { data: kpi, isLoading: loadingKpi, refetch: refetchKpi, isFetching } = useKpiDashboardData();
  const { data: counts, isLoading: loadingCounts, refetch: refetchCounts } = useCountsSummary();
  const { data: ticketSummary, isLoading: loadingTickets, refetch: refetchTickets } = useTicketsSummary();
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useStatisticsSummary();

  const handleRefreshAll = () => {
    refetchKpi();
    refetchCounts();
    refetchTickets();
    refetchStats();
  };

  const operationalModules = [
    { title: 'Units & Flats', href: '/units', count: kpi?.totalUnits ?? 0, label: 'Units Total', icon: Building2, color: 'text-blue-500' },
    { title: 'Helpdesk SLA', href: '/tickets', count: kpi?.openTickets ?? 0, label: 'Open Tickets', icon: Ticket, color: 'text-orange-500' },
    { title: 'PMS Inventory', href: '/inventory', count: 'Active', label: 'Procurement', icon: Boxes, color: 'text-indigo-500' },
    { title: 'Assets & Audits', href: '/assets', count: kpi?.assets?.total_assets ?? 0, label: 'Assets', icon: Wrench, color: 'text-teal-500' },
    { title: 'Invoices & Dues', href: '/invoices', count: formatCurrency(kpi?.totalOutstanding ?? 0), label: 'Outstanding', icon: FileText, color: 'text-red-500' },
    { title: 'Collections', href: '/receipts', count: formatCurrency(kpi?.totalCollected ?? 0), label: 'Collected', icon: Receipt, color: 'text-emerald-500' },
    { title: 'Gate & Visitors', href: '/gate', count: kpi?.gate?.today_visitors ?? 0, label: "Today's Visitors", icon: ShieldAlert, color: 'text-cyan-500' },
    { title: 'Guard Patrol', href: '/patrol', count: 'Active', label: 'Checkpoints', icon: Footprints, color: 'text-sky-500' },
    { title: 'Parking & EV', href: '/parking', count: `${kpi?.parking?.vacant_slots ?? 0} Vacant`, label: 'Parking Lots', icon: Car, color: 'text-emerald-600' },
    { title: 'Amenities', href: '/amenities', count: 'Bookings', label: 'Facilities', icon: CalendarCheck, color: 'text-purple-500' },
    { title: 'KYC Approvals', href: '/setup/kyc', count: 'Verify', label: 'Identity Proofs', icon: UserCheck, color: 'text-amber-500' },
    { title: 'Member Categories', href: '/setup/categories', count: 'Rules', label: 'Privileges', icon: Tags, color: 'text-pink-500' },
    { title: 'SOS Alarms', href: '/sos', count: '0 Live', label: 'Emergency', icon: AlertTriangle, color: 'text-rose-500' },
    { title: 'Accounts & GL', href: '/accounts', count: 'Ledger', label: 'Accounting', icon: Wallet, color: 'text-blue-600' },
  ];

  // Prepare export dataset
  const exportData: Record<string, unknown>[] = [
    { metric: 'Total Units', value: kpi?.totalUnits ?? 0 },
    { metric: 'Occupied Units', value: kpi?.occupiedUnits ?? 0 },
    { metric: 'Vacant Units', value: kpi?.vacantUnits ?? 0 },
    { metric: 'Active Residents', value: kpi?.activeResidents ?? 0 },
    { metric: 'Owners Count', value: kpi?.ownersCount ?? 0 },
    { metric: 'Tenants Count', value: kpi?.tenantsCount ?? 0 },
    { metric: 'Total Billed', value: kpi?.totalBilled ?? 0 },
    { metric: 'Total Collected', value: kpi?.totalCollected ?? 0 },
    { metric: 'Total Outstanding', value: kpi?.totalOutstanding ?? 0 },
    { metric: 'Collection Rate (%)', value: kpi?.collectionRate ?? '0%' },
    { metric: 'Total Tickets', value: kpi?.totalTickets ?? 0 },
    { metric: 'Open Tickets', value: kpi?.openTickets ?? 0 },
    { metric: 'Resolved Tickets', value: kpi?.resolvedTickets ?? 0 },
    { metric: 'SLA Breaches', value: kpi?.slaBreaches ?? 0 },
    { metric: 'Golden Queue Tickets', value: kpi?.goldenQueueCount ?? 0 },
    { metric: 'Active Overstay Alerts', value: kpi?.gate?.active_overstays ?? 0 },
  ];

  const occupancyPieData = [
    { name: 'Occupied', value: kpi?.occupiedUnits ?? 0 },
    { name: 'Vacant', value: kpi?.vacantUnits ?? 0 },
  ];

  const categoryChartData = (ticketSummary?.categories ?? []).map((cat) => ({
    name: cat.category || 'General',
    Total: cat.total,
    Open: cat.open_count,
    Breached: cat.breached_count,
  }));

  const footfallData = (stats?.dailyFootfall ?? []).map((item) => ({
    date: item.date,
    visitors: item.visitors_count,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational KPI Command Center"
        description="Comprehensive 360° health overview and sub-module navigation across all 14 property operations domains."
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              filename="operational-kpi-summary"
              data={exportData}
              columns={[
                { key: 'metric', label: 'Operational Metric' },
                { key: 'value', label: 'Value' },
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Top Essential Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Occupancy Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingKpi ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {kpi?.totalUnits ? Math.round(((kpi.occupiedUnits || 0) / kpi.totalUnits) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpi?.occupiedUnits ?? 0} occupied of {kpi?.totalUnits ?? 0} total units
                </p>
                <div className="mt-2 flex gap-2 text-xs">
                  <Badge variant="outline" className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                    {kpi?.ownersCount ?? 0} Owners
                  </Badge>
                  <Badge variant="outline" className="text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                    {kpi?.tenantsCount ?? 0} Tenants
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Financial Collection */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Efficiency</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingKpi ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-600">
                  {kpi?.collectionRate ?? '0%'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(kpi?.totalCollected ?? 0)} collected of {formatCurrency(kpi?.totalBilled ?? 0)}
                </p>
                <div className="mt-2 text-xs font-medium text-destructive">
                  Outstanding: {formatCurrency(kpi?.totalOutstanding ?? 0)}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Helpdesk & SLA Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Helpdesk Health</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingKpi ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{kpi?.openTickets ?? 0}</span>
                  <span className="text-xs text-muted-foreground">Active Open</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {(kpi?.slaBreaches ?? 0) > 0 ? (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {kpi?.slaBreaches} SLA Breached
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-600">
                      0 SLA Breaches
                    </Badge>
                  )}
                  {(kpi?.goldenQueueCount ?? 0) > 0 && (
                    <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                      ★ {kpi?.goldenQueueCount} Golden Queue
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security & Gate Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gate & Security</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingKpi ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold">{kpi?.gate?.today_visitors ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Visitors logged today ({kpi?.gate?.today_staff_entries ?? 0} staff entries)
                </p>
                <div className="mt-2 text-xs">
                  {(kpi?.gate?.active_overstays ?? 0) > 0 ? (
                    <Badge variant="destructive">
                      {kpi?.gate?.active_overstays} Active Overstays
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> No Overstays
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 14 Operational Sub-Module Navigation Matrix */}
      <div>
        <h3 className="text-base font-semibold tracking-tight mb-3">14 Operational Domain Hubs</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {operationalModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.title}
                href={mod.href}
                className="group relative flex flex-col justify-between p-3.5 bg-card border rounded-lg hover:shadow-md hover:border-primary/50 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-md bg-muted/60 group-hover:bg-primary/10 ${mod.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-3">
                  <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {mod.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {mod.count} {mod.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recharts Analytics Visualization Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Income vs Expense Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Financial Cashflow Trend</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Billed collections vs expenses over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingKpi ? (
              <Skeleton className="h-64 w-full" />
            ) : !kpi?.monthlyTrend || kpi.monthlyTrend.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                <Receipt className="h-8 w-8 mb-2 opacity-50" />
                No financial cashflow data recorded yet
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kpi.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Helpdesk Categories Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Ticket Workload by Category</span>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Distribution of open vs breached tickets by category</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTickets ? (
              <Skeleton className="h-64 w-full" />
            ) : categoryChartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                <Ticket className="h-8 w-8 mb-2 opacity-50" />
                No ticket category activity recorded yet
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Open" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Breached" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Occupancy Proportion Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unit Occupancy Distribution</CardTitle>
            <CardDescription>Current ratio of occupied flats vs vacant flats</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingKpi ? (
              <Skeleton className="h-64 w-full" />
            ) : (kpi?.totalUnits ?? 0) === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                <Building2 className="h-8 w-8 mb-2 opacity-50" />
                No flat units configured in this community
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={occupancyPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {occupancyPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 7-Day Gate Footfall Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>7-Day Gate Footfall Trend</span>
              <Footprints className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Daily visitor footfall entering the community gate</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-64 w-full" />
            ) : footfallData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                <ShieldAlert className="h-8 w-8 mb-2 opacity-50" />
                No gate entry logs recorded in the past 7 days
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={footfallData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Block-by-Block Breakdown Table */}
      {counts?.blocks && counts.blocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Block-Level Occupancy Breakdown</CardTitle>
            <CardDescription>Summary of units across physical towers/wings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-left">
                    <th className="p-3">Block / Tower</th>
                    <th className="p-3">Total Flats</th>
                    <th className="p-3">Occupied</th>
                    <th className="p-3">Vacant</th>
                    <th className="p-3">Occupancy Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {counts.blocks.map((blk) => {
                    const rate = blk.total_flats > 0 ? Math.round((blk.occupied_flats / blk.total_flats) * 100) : 0;
                    return (
                      <tr key={blk.block} className="hover:bg-muted/20">
                        <td className="p-3 font-medium">{blk.block}</td>
                        <td className="p-3">{blk.total_flats}</td>
                        <td className="p-3 text-emerald-600 font-medium">{blk.occupied_flats}</td>
                        <td className="p-3 text-muted-foreground">{blk.vacant_flats}</td>
                        <td className="p-3">
                          <Badge variant="outline">{rate}%</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
