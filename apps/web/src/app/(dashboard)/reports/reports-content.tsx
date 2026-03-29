'use client';

import { useState, type ReactNode } from 'react';
import {
  FileBarChart,
  Scale,
  BookOpen,
  AlertCircle,
  TrendingUp,
  IndianRupee,
  Calendar,
  ChevronLeft,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/layout/page-header';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  useTrialBalance,
  useBalanceSheet,
  useIncomeExpenditure,
  useGeneralLedgerReport,
  useDefaulters,
  useVendorAging,
  useLedgerAccounts,
} from '@/hooks';

type ReportId = 'trial-balance' | 'balance-sheet' | 'income-expenditure' | 'general-ledger' | 'defaulters' | 'vendor-aging';

interface ReportCardInfo {
  id: ReportId;
  title: string;
  description: string;
  icon: ReactNode;
  category: 'accounting' | 'management';
  needsDateRange: boolean;
  needsAsOfDate: boolean;
  needsAccount: boolean;
}

const reportCards: ReportCardInfo[] = [
  {
    id: 'trial-balance',
    title: 'Trial Balance',
    description: 'Summary of all ledger account balances showing debits and credits',
    icon: <Scale className="h-6 w-6 text-primary" />,
    category: 'accounting',
    needsDateRange: false,
    needsAsOfDate: true,
    needsAccount: false,
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet',
    description: 'Statement of assets, liabilities, and equity at a point in time',
    icon: <FileBarChart className="h-6 w-6 text-success" />,
    category: 'accounting',
    needsDateRange: false,
    needsAsOfDate: true,
    needsAccount: false,
  },
  {
    id: 'income-expenditure',
    title: 'Income & Expenditure',
    description: 'Revenue and expenses for a given period showing surplus or deficit',
    icon: <TrendingUp className="h-6 w-6 text-warning" />,
    category: 'accounting',
    needsDateRange: true,
    needsAsOfDate: false,
    needsAccount: false,
  },
  {
    id: 'general-ledger',
    title: 'General Ledger',
    description: 'Detailed transactions for a selected ledger account',
    icon: <BookOpen className="h-6 w-6 text-primary" />,
    category: 'accounting',
    needsDateRange: true,
    needsAsOfDate: false,
    needsAccount: true,
  },
  {
    id: 'defaulters',
    title: 'Defaulters Report',
    description: 'List of units with outstanding dues and aging analysis',
    icon: <AlertCircle className="h-6 w-6 text-destructive" />,
    category: 'management',
    needsDateRange: false,
    needsAsOfDate: false,
    needsAccount: false,
  },
  {
    id: 'vendor-aging',
    title: 'Vendor Aging',
    description: 'Outstanding payables grouped by 0-30, 31-60, 61-90, 90+ day buckets',
    icon: <IndianRupee className="h-6 w-6 text-success" />,
    category: 'management',
    needsDateRange: false,
    needsAsOfDate: false,
    needsAccount: false,
  },
];

function ReportSkeleton(): ReactNode {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

function TrialBalanceView({ asOfDate }: { asOfDate: string }): ReactNode {
  const { data, isLoading } = useTrialBalance(asOfDate);

  if (isLoading) return <ReportSkeleton />;
  if (!data) return <p className="py-8 text-center text-muted-foreground">No data available</p>;

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">As of {formatDate(data.as_of_date)}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Code</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead>Group</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row) => (
            <TableRow key={row.account_id}>
              <TableCell className="font-mono text-xs">{row.account_code}</TableCell>
              <TableCell className="font-medium">{row.account_name}</TableCell>
              <TableCell className="text-muted-foreground">{row.group_name}</TableCell>
              <TableCell className="text-right">
                {row.debit > 0 ? formatCurrency(row.debit) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {row.credit > 0 ? formatCurrency(row.credit) : '-'}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-bold">
            <TableCell colSpan={3} className="text-right">
              Total
            </TableCell>
            <TableCell className="text-right">{formatCurrency(data.total_debit)}</TableCell>
            <TableCell className="text-right">{formatCurrency(data.total_credit)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function BalanceSheetView({ asOfDate }: { asOfDate: string }): ReactNode {
  const { data, isLoading } = useBalanceSheet(asOfDate);

  if (isLoading) return <ReportSkeleton />;
  if (!data) return <p className="py-8 text-center text-muted-foreground">No data available</p>;

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">As of {formatDate(data.as_of_date)}</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-lg font-semibold">Assets</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.assets.map((section) => (
                <>
                  <TableRow key={`group-${section.group}`} className="bg-muted/50">
                    <TableCell colSpan={2} className="font-semibold">{section.group}</TableCell>
                  </TableRow>
                  {section.accounts.map((acc) => (
                    <TableRow key={acc.account_id}>
                      <TableCell className="pl-6">{acc.account_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(acc.balance)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow key={`subtotal-${section.group}`}>
                    <TableCell className="pl-6 font-medium">Subtotal</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(section.total)}
                    </TableCell>
                  </TableRow>
                </>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell>Total Assets</TableCell>
                <TableCell className="text-right">{formatCurrency(data.total_assets)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div>
          <h3 className="mb-3 text-lg font-semibold">Liabilities</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.liabilities.map((section) => (
                <>
                  <TableRow key={`group-${section.group}`} className="bg-muted/50">
                    <TableCell colSpan={2} className="font-semibold">{section.group}</TableCell>
                  </TableRow>
                  {section.accounts.map((acc) => (
                    <TableRow key={acc.account_id}>
                      <TableCell className="pl-6">{acc.account_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(acc.balance)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow key={`subtotal-${section.group}`}>
                    <TableCell className="pl-6 font-medium">Subtotal</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(section.total)}
                    </TableCell>
                  </TableRow>
                </>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell>Total Liabilities</TableCell>
                <TableCell className="text-right">{formatCurrency(data.total_liabilities)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function IncomeExpenditureView({ startDate, endDate }: { startDate: string; endDate: string }): ReactNode {
  const { data, isLoading } = useIncomeExpenditure(startDate, endDate);

  if (isLoading) return <ReportSkeleton />;
  if (!data) return <p className="py-8 text-center text-muted-foreground">No data available</p>;

  const isSurplus = data.surplus_or_deficit >= 0;

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Period: {formatDate(data.start_date)} to {formatDate(data.end_date)}
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-lg font-semibold text-success">Income</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.income.map((row) => (
                <TableRow key={row.account_id}>
                  <TableCell className="font-mono text-xs">{row.account_code}</TableCell>
                  <TableCell>{row.account_name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell colSpan={2} className="text-right">Total Income</TableCell>
                <TableCell className="text-right text-success">
                  {formatCurrency(data.total_income)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div>
          <h3 className="mb-3 text-lg font-semibold text-destructive">Expenditure</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.expenditure.map((row) => (
                <TableRow key={row.account_id}>
                  <TableCell className="font-mono text-xs">{row.account_code}</TableCell>
                  <TableCell>{row.account_name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell colSpan={2} className="text-right">Total Expenditure</TableCell>
                <TableCell className="text-right text-destructive">
                  {formatCurrency(data.total_expenditure)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <Separator className="my-6" />
      <div className="flex items-center justify-between rounded-lg border p-4">
        <span className="text-lg font-semibold">
          {isSurplus ? 'Surplus' : 'Deficit'}
        </span>
        <span className={`text-2xl font-bold ${isSurplus ? 'text-success' : 'text-destructive'}`}>
          {formatCurrency(Math.abs(data.surplus_or_deficit))}
        </span>
      </div>
    </div>
  );
}

function GeneralLedgerView({
  accountId,
  startDate,
  endDate,
}: {
  accountId: string;
  startDate: string;
  endDate: string;
}): ReactNode {
  const { data, isLoading } = useGeneralLedgerReport(accountId, startDate, endDate);

  if (isLoading) return <ReportSkeleton />;
  if (!data) return <p className="py-8 text-center text-muted-foreground">Select an account to view its ledger</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{data.account_name}</h3>
          <p className="text-sm text-muted-foreground">
            {formatDate(data.start_date)} to {formatDate(data.end_date)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Opening Balance</p>
          <p className="font-semibold">{formatCurrency(data.opening_balance)}</p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Entry #</TableHead>
            <TableHead>Narration</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.transactions.map((txn, idx) => (
            <TableRow key={idx}>
              <TableCell className="text-muted-foreground">{formatDate(txn.date)}</TableCell>
              <TableCell className="font-mono text-xs">{txn.entry_number}</TableCell>
              <TableCell>{txn.narration}</TableCell>
              <TableCell className="text-right">
                {txn.debit > 0 ? formatCurrency(txn.debit) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {txn.credit > 0 ? formatCurrency(txn.credit) : '-'}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(txn.running_balance)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-bold">
            <TableCell colSpan={5} className="text-right">Closing Balance</TableCell>
            <TableCell className="text-right">{formatCurrency(data.closing_balance)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function DefaultersView(): ReactNode {
  const { data, isLoading } = useDefaulters();

  if (isLoading) return <ReportSkeleton />;
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No defaulters found</p>;
  }

  const totalOverdue = data.reduce((sum, d) => sum + d.total_overdue, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} defaulting units</p>
        <p className="font-semibold text-destructive">
          Total Overdue: {formatCurrency(totalOverdue)}
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unit</TableHead>
            <TableHead>Block</TableHead>
            <TableHead className="text-right">Overdue Amount</TableHead>
            <TableHead className="text-right">Overdue Months</TableHead>
            <TableHead>Oldest Due Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.unit_id}>
              <TableCell className="font-medium">{row.unit_number}</TableCell>
              <TableCell>{row.block ?? '-'}</TableCell>
              <TableCell className="text-right font-medium text-destructive">
                {formatCurrency(row.total_overdue)}
              </TableCell>
              <TableCell className="text-right">{row.overdue_months}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(row.oldest_due_date)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function VendorAgingView(): ReactNode {
  const { data, isLoading } = useVendorAging();

  if (isLoading) return <ReportSkeleton />;
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No vendor aging data</p>;
  }

  const totals = data.reduce(
    (acc, row) => ({
      current: acc.current + row.current,
      days_30: acc.days_30 + row.days_30,
      days_60: acc.days_60 + row.days_60,
      days_90: acc.days_90 + row.days_90,
      over_90: acc.over_90 + row.over_90,
      total: acc.total + row.total,
    }),
    { current: 0, days_30: 0, days_60: 0, days_90: 0, over_90: 0, total: 0 },
  );

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">1-30 Days</TableHead>
            <TableHead className="text-right">31-60 Days</TableHead>
            <TableHead className="text-right">61-90 Days</TableHead>
            <TableHead className="text-right">90+ Days</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.vendor_id}>
              <TableCell className="font-medium">{row.vendor_name}</TableCell>
              <TableCell className="text-right">
                {row.current > 0 ? formatCurrency(row.current) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {row.days_30 > 0 ? formatCurrency(row.days_30) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {row.days_60 > 0 ? formatCurrency(row.days_60) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {row.days_90 > 0 ? formatCurrency(row.days_90) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {row.over_90 > 0 ? (
                  <span className="text-destructive">{formatCurrency(row.over_90)}</span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(row.total)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-bold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.current)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.days_30)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.days_60)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.days_90)}</TableCell>
            <TableCell className="text-right text-destructive">{formatCurrency(totals.over_90)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default function ReportsContent(): ReactNode {
  const [selectedReport, setSelectedReport] = useState<ReportId | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('2025-04-01');
  const [endDate, setEndDate] = useState('2026-03-31');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const accountsQuery = useLedgerAccounts({ limit: 500 });
  const accounts = accountsQuery.data?.data ?? [];

  const selectedCard = reportCards.find((r) => r.id === selectedReport);

  const accountingReports = reportCards.filter((r) => r.category === 'accounting');
  const managementReports = reportCards.filter((r) => r.category === 'management');

  function renderSelectedReport(): ReactNode {
    if (!selectedReport) return null;

    switch (selectedReport) {
      case 'trial-balance':
        return <TrialBalanceView asOfDate={asOfDate} />;
      case 'balance-sheet':
        return <BalanceSheetView asOfDate={asOfDate} />;
      case 'income-expenditure':
        return <IncomeExpenditureView startDate={startDate} endDate={endDate} />;
      case 'general-ledger':
        return <GeneralLedgerView accountId={selectedAccountId} startDate={startDate} endDate={endDate} />;
      case 'defaulters':
        return <DefaultersView />;
      case 'vendor-aging':
        return <VendorAgingView />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Reports' }]}
        title="Reports"
        description="Financial and management reports — trial balance, balance sheet, I&E, general ledger"
      />

      {!selectedReport ? (
        <>
          <div>
            <h2 className="mb-4 text-lg font-semibold">Accounting Reports</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accountingReports.map((report) => (
                <Card
                  key={report.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      {report.icon}
                      <Badge variant="outline">Accounting</Badge>
                    </div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold">Management Reports</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {managementReports.map((report) => (
                <Card
                  key={report.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      {report.icon}
                      <Badge variant="outline">Management</Badge>
                    </div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Reports
            </Button>
            {selectedCard && (
              <div className="flex items-center gap-2">
                {selectedCard.icon}
                <h2 className="text-lg font-semibold">{selectedCard.title}</h2>
              </div>
            )}
          </div>

          {(selectedCard?.needsAsOfDate || selectedCard?.needsDateRange || selectedCard?.needsAccount) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  {selectedCard.needsAsOfDate && (
                    <div className="space-y-2">
                      <Label htmlFor="as-of-date">As of Date</Label>
                      <Input
                        id="as-of-date"
                        type="date"
                        value={asOfDate}
                        onChange={(e) => setAsOfDate(e.target.value)}
                      />
                    </div>
                  )}
                  {selectedCard.needsDateRange && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setStartDate('2025-04-01');
                            setEndDate('2026-03-31');
                          }}
                        >
                          <Calendar className="mr-1 h-3 w-3" />
                          Full Year
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const now = new Date();
                            const year = now.getFullYear();
                            const month = String(now.getMonth() + 1).padStart(2, '0');
                            setStartDate(`${year}-${month}-01`);
                            const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
                            setEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
                          }}
                        >
                          This Month
                        </Button>
                      </div>
                    </>
                  )}
                  {selectedCard.needsAccount && (
                    <div className="space-y-2">
                      <Label htmlFor="account-select">Ledger Account</Label>
                      <Select
                        id="account-select"
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                      >
                        <option value="">Select account</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              {renderSelectedReport()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
