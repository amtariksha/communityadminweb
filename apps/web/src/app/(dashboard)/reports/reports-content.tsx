'use client';

import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import {
  BalanceSheetView,
  DefaultersView,
  GeneralLedgerView,
  IncomeExpenditureView,
  TrialBalanceOptions,
  VendorAgingView,
} from '@/components/ledger-reports';
import { reportFromParam, type ReportId } from './report-param';
import { useReportDates } from './use-report-dates';
import { useLedgerAccounts } from '@/hooks';
import { todayIST } from '@/lib/date';

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
    // GL-15: the trial balance has its own From / To / Type form.
    needsAsOfDate: false,
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

export default function ReportsContent(): ReactNode {
  // The dashboard's General Ledger card opens a report with ?report=<id>.
  const searchParams = useSearchParams();
  const [selectedReport, setSelectedReport] = useState<ReportId | null>(() =>
    reportFromParam(searchParams?.get('report') ?? null),
  );
  const dates = useReportDates();
  const { asOfDate, setAsOfDate, startDate, setStartDate, endDate, setEndDate } = dates;
  const [selectedAccountId, setSelectedAccountId] = useState('');
  // GL-16: the statements' suppress switches (retained earnings on for the I&E, as the API does).
  const [suppressRE, setSuppressRE] = useState<boolean | null>(null);
  const [suppressOB, setSuppressOB] = useState(false);
  const switches = {
    suppressRetainedEarnings: suppressRE ?? selectedReport === 'income-expenditure',
    suppressOpeningBalance: suppressOB,
  };
  const showSwitches = selectedReport === 'balance-sheet' || selectedReport === 'income-expenditure';

  const accountsQuery = useLedgerAccounts({ limit: 500 });
  const accounts = accountsQuery.data?.data ?? [];

  const selectedCard = reportCards.find((r) => r.id === selectedReport);

  const accountingReports = reportCards.filter((r) => r.category === 'accounting');
  const managementReports = reportCards.filter((r) => r.category === 'management');

  function renderSelectedReport(): ReactNode {
    if (!selectedReport) return null;

    switch (selectedReport) {
      case 'trial-balance':
        return <TrialBalanceOptions />;
      case 'balance-sheet':
        return <BalanceSheetView asOfDate={asOfDate} switches={switches} />;
      case 'income-expenditure':
        return <IncomeExpenditureView startDate={startDate} endDate={endDate} switches={switches} />;
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
        actions={
          <ExportButton
            data={accounts as unknown as Record<string, unknown>[]}
            filename={`ledger-accounts-${todayIST()}`}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Account Name' },
              { key: 'opening_balance', label: 'Opening Balance' },
              { key: 'balance_type', label: 'Balance Type' },
            ]}
          />
        }
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
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="as-of-date">As of Date</Label>
                        <Input
                          id="as-of-date"
                          type="date"
                          value={asOfDate}
                          onChange={(e) => setAsOfDate(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={dates.yearEnd}
                        >
                          <Calendar className="mr-1 h-3 w-3" />
                          Year End
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={dates.asOfToday}
                        >
                          Today
                        </Button>
                      </div>
                    </>
                  )}
                  {showSwitches && (
                    <div className="flex flex-col gap-1 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={switches.suppressRetainedEarnings} onChange={(e) => setSuppressRE(e.target.checked)} />
                        Suppress Retained Earnings Transactions
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={suppressOB} onChange={(e) => setSuppressOB(e.target.checked)} />
                        Suppress Opening Balance
                      </label>
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
                          onClick={dates.fullYear}
                        >
                          <Calendar className="mr-1 h-3 w-3" />
                          Full Year
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={dates.thisMonth}
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
