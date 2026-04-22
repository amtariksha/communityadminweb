'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Download,
  FileText,
  IndianRupee,
  Receipt,
  Scroll,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  useGstSummary,
  useGstReport,
  useGstr1Export,
  useTdsSummary,
  useTdsVendors,
  useChallans,
  useRemittances,
  useComplianceCalendar,
} from '@/hooks';
import type { ComplianceItem } from '@/hooks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrentFyRange(): { from_date: string; to_date: string } {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    from_date: `${year}-04-01`,
    to_date: `${year + 1}-03-31`,
  };
}

function monthPeriod(): string {
  // GSTR-1 period is MMYYYY (e.g. 042026 for April 2026).
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
}

function complianceBadge(
  status: ComplianceItem['status'],
): 'default' | 'destructive' | 'warning' | 'success' | 'secondary' {
  switch (status) {
    case 'overdue':
      return 'destructive';
    case 'due_soon':
      return 'warning';
    case 'completed':
      return 'success';
    case 'upcoming':
    default:
      return 'secondary';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GstSummaryCards({
  from,
  to,
}: {
  from: string;
  to: string;
}): ReactNode {
  const { data, isLoading } = useGstSummary({ from_date: from, to_date: to });

  const cards: Array<{ label: string; value: number; icon: ReactNode; accent?: string }> = [
    { label: 'Total Taxable', value: data?.total_taxable ?? 0, icon: <IndianRupee className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Total GST', value: data?.total_gst ?? 0, icon: <Receipt className="h-4 w-4 text-muted-foreground" /> },
    { label: 'ITC Available', value: data?.itc_available ?? 0, icon: <Receipt className="h-4 w-4 text-success" /> },
    { label: 'Net GST Payable', value: data?.net_gst_payable ?? 0, icon: <AlertCircle className="h-4 w-4 text-destructive" />, accent: 'text-destructive' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{c.label}</CardTitle>
            {c.icon}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className={`text-2xl font-bold ${c.accent ?? ''}`}>
                {formatCurrency(c.value)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Current FY</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GstReportSection({
  from,
  to,
}: {
  from: string;
  to: string;
}): ReactNode {
  const query = useGstReport({ from_date: from, to_date: to });
  const rows = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>GST Invoice Report</CardTitle>
          <ExportButton
            data={rows as unknown as Record<string, unknown>[]}
            filename={`gst-report-${from}-to-${to}`}
            columns={[
              { key: 'invoice_number', label: 'Invoice' },
              { key: 'invoice_date', label: 'Date' },
              { key: 'unit_number', label: 'Unit' },
              { key: 'taxable_amount', label: 'Taxable' },
              { key: 'gst_rate', label: 'Rate %' },
              { key: 'cgst', label: 'CGST' },
              { key: 'sgst', label: 'SGST' },
              { key: 'gst_amount', label: 'GST Total' },
              { key: 'total', label: 'Total' },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">CGST</TableHead>
              <TableHead className="text-right">SGST</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : query.isError ? (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-destructive">
                  Failed to load GST report —{' '}
                  {(query.error as Error)?.message ?? 'unknown error'}.{' '}
                  <Button
                    size="sm"
                    variant="link"
                    className="px-1 text-destructive underline"
                    onClick={() => query.refetch()}
                  >
                    Retry
                  </Button>
                </TableCell>
              </TableRow>
            ) : rows.length > 0 ? (
              rows.map((r) => (
                <TableRow key={r.invoice_id}>
                  <TableCell className="font-mono text-xs">{r.invoice_number}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.invoice_date)}</TableCell>
                  <TableCell>{r.unit_number ?? '—'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.taxable_amount)}</TableCell>
                  <TableCell className="text-right">{r.gst_rate}%</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.cgst)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.sgst)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(r.total)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No GST-bearing invoices in this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Gstr1ExportCard(): ReactNode {
  const [period, setPeriod] = useState<string>(monthPeriod());
  const [fetchNow, setFetchNow] = useState(false);
  const query = useGstr1Export(fetchNow ? period : '');

  function handleGenerate(): void {
    setFetchNow(true);
  }

  function handleDownload(): void {
    if (!query.data) return;
    const blob = new Blob([JSON.stringify(query.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gstr1-${period}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GSTR-1 Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Generates the GSTR-1 filing payload (JSON). Hand this to your CA
          or upload to the GST portal. Period format: MMYYYY (e.g.{' '}
          <code>042026</code> for April 2026).
        </p>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="gstr1-period">Period (MMYYYY)</Label>
            <Input
              id="gstr1-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="w-28 font-mono"
            />
          </div>
          <Button onClick={handleGenerate} disabled={period.length !== 6}>
            Generate
          </Button>
          {query.data && (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download JSON
            </Button>
          )}
        </div>
        {query.isLoading && (
          <Skeleton className="h-16 w-full" />
        )}
        {query.isError && (
          <p className="text-sm text-destructive">
            Failed to generate — {(query.error as Error)?.message ?? 'unknown error'}.
          </p>
        )}
        {query.data && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-muted-foreground">Invoices</p>
                <p className="font-semibold">{query.data.summary.total_invoices}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Taxable</p>
                <p className="font-semibold">{formatCurrency(query.data.summary.total_taxable)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tax</p>
                <p className="font-semibold">{formatCurrency(query.data.summary.total_tax)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TdsSummaryTable({
  from,
  to,
}: {
  from: string;
  to: string;
}): ReactNode {
  const query = useTdsSummary({ from_date: from, to_date: to });
  const rows = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>TDS Summary (by Section)</CardTitle>
          <ExportButton
            data={rows as unknown as Record<string, unknown>[]}
            filename={`tds-summary-${from}-to-${to}`}
            columns={[
              { key: 'tds_section', label: 'Section' },
              { key: 'vendor_count', label: 'Vendors' },
              { key: 'total_amount', label: 'Amount Paid' },
              { key: 'tds_deducted', label: 'TDS Deducted' },
              { key: 'tds_deposited', label: 'TDS Deposited' },
              { key: 'tds_pending', label: 'Pending' },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Vendors</TableHead>
              <TableHead className="text-right">Amount Paid</TableHead>
              <TableHead className="text-right">Deducted</TableHead>
              <TableHead className="text-right">Deposited</TableHead>
              <TableHead className="text-right">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length > 0 ? (
              rows.map((r) => (
                <TableRow key={r.tds_section}>
                  <TableCell className="font-medium">{r.tds_section}</TableCell>
                  <TableCell className="text-right">{r.vendor_count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.total_amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.tds_deducted)}</TableCell>
                  <TableCell className="text-right text-success">
                    {formatCurrency(r.tds_deposited)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${r.tds_pending > 0 ? 'text-destructive' : ''}`}
                  >
                    {formatCurrency(r.tds_pending)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No TDS deductions in this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TdsVendorsTable({
  from,
  to,
}: {
  from: string;
  to: string;
}): ReactNode {
  const query = useTdsVendors({ from_date: from, to_date: to });
  const rows = (query.data ?? []) as Array<Record<string, unknown>>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>TDS by Vendor</CardTitle>
          <ExportButton
            data={rows}
            filename={`tds-vendors-${from}-to-${to}`}
            columns={[
              { key: 'vendor_name', label: 'Vendor' },
              { key: 'pan', label: 'PAN' },
              { key: 'tds_section', label: 'Section' },
              { key: 'total_amount', label: 'Amount' },
              { key: 'tds_deducted', label: 'TDS' },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">TDS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length > 0 ? (
              rows.map((r, idx) => (
                <TableRow key={(r.vendor_id as string) ?? idx}>
                  <TableCell className="font-medium">{(r.vendor_name as string) ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{(r.pan as string) ?? '—'}</TableCell>
                  <TableCell>{(r.tds_section as string) ?? '—'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.total_amount ?? 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.tds_deducted ?? 0))}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No vendor TDS in this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ChallansAndRemittances(): ReactNode {
  const challansQuery = useChallans();
  const remittancesQuery = useRemittances();

  const challans = challansQuery.data ?? [];
  const remittances = remittancesQuery.data ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>TDS Challans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challan #</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challansQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : challans.length > 0 ? (
                challans.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.challan_number}</TableCell>
                    <TableCell>{c.tds_section}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(c.payment_date)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(c.amount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No challans recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remittances (GST + TDS payments)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {remittancesQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : remittances.length > 0 ? (
                remittances.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="uppercase font-mono text-xs">{r.type}</TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(r.payment_date)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(r.amount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No remittances recorded.
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

function ComplianceCalendar(): ReactNode {
  const query = useComplianceCalendar();
  const items = query.data?.items ?? [];

  // Sort so overdue floats to the top, then due_soon, then upcoming, then completed.
  const statusOrder: Record<ComplianceItem['status'], number> = {
    overdue: 0,
    due_soon: 1,
    upcoming: 2,
    completed: 3,
  };
  const sorted = [...items].sort((a, b) =>
    statusOrder[a.status] - statusOrder[b.status] ||
    a.due_date.localeCompare(b.due_date),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Compliance Calendar</CardTitle>
          </div>
          <Badge variant="outline" className="font-normal">
            {items.length} items · {items.filter((i) => i.status === 'overdue').length} overdue
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Upcoming and overdue statutory deadlines — GSTR-1 filings, TDS
          deposits (7th of each month), quarterly returns. Sorted with
          overdue first.
        </p>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sorted.length > 0 ? (
          <ul className="space-y-2">
            {sorted.map((item, idx) => (
              <li
                key={`${item.type}-${item.due_date}-${idx}`}
                className="flex items-start justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {item.type.toUpperCase()}
                    </p>
                    <Badge variant={complianceBadge(item.status)}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.frequency} · {item.status === 'completed' ? 'completed ' : 'due '}
                    {formatDate(item.due_date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No upcoming compliance items. Either the calendar isn&apos;t
            configured for this tenant or everything is filed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type TabKey = 'gst' | 'tds' | 'compliance';

const TABS: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  { key: 'gst', label: 'GST', icon: <Receipt className="h-4 w-4" /> },
  { key: 'tds', label: 'TDS', icon: <Scroll className="h-4 w-4" /> },
  { key: 'compliance', label: 'Compliance', icon: <CalendarClock className="h-4 w-4" /> },
];

export default function TaxContent(): ReactNode {
  const fyDefault = useMemo(() => getCurrentFyRange(), []);
  const [fromDate, setFromDate] = useState(fyDefault.from_date);
  const [toDate, setToDate] = useState(fyDefault.to_date);
  const [activeTab, setActiveTab] = useState<TabKey>('gst');

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Tax & Compliance' }]}
        title="Tax & Compliance"
        description="GST summaries, invoice reports, TDS tracking, Form 16A, and upcoming statutory deadlines."
      />

      {/* Date range picker — shared across GST + TDS tabs */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="space-y-1">
            <Label htmlFor="tax-from">From</Label>
            <Input
              id="tax-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tax-to">To</Label>
            <Input
              id="tax-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-44"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFromDate(fyDefault.from_date);
              setToDate(fyDefault.to_date);
            }}
          >
            Current FY
          </Button>
        </CardContent>
      </Card>

      {/* Tab strip */}
      <div className="border-b">
        <nav className="flex gap-6" aria-label="Tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={
                'flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ' +
                (activeTab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground')
              }
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'gst' && (
        <div className="space-y-4">
          <GstSummaryCards from={fromDate} to={toDate} />
          <GstReportSection from={fromDate} to={toDate} />
          <Gstr1ExportCard />
        </div>
      )}

      {activeTab === 'tds' && (
        <div className="space-y-4">
          <TdsSummaryTable from={fromDate} to={toDate} />
          <TdsVendorsTable from={fromDate} to={toDate} />
          <ChallansAndRemittances />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Form 16A
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Form 16A certificates are generated per vendor. Go to{' '}
                <span className="font-medium">Vendors → Vendor detail</span>{' '}
                and click the Form 16A action for the financial year you
                need — the PDF is emailed to the vendor contact on file.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <ComplianceCalendar />
        </div>
      )}
    </div>
  );
}
