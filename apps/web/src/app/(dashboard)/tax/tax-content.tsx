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
  // QA #232 — Form 16A picker now has a vendor + FY selector and a
  // printable view that the operator can browser-print to PDF.
  useForm16A,
  useFinancialYears,
  useVendors,
} from '@/hooks';
import type { ComplianceItem, Form16AData } from '@/hooks';
import { Select } from '@/components/ui/select';

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
  // QA #237 — server validates `period` as YYYY-MM (matches GSTR-1
  // export internals at tax.service.ts#exportGstr1). Earlier UI sent
  // MMYYYY (the GST portal's filing convention) which 400-ed every
  // submit. Sticking with YYYY-MM here; the backend transposes to
  // MMYYYY when it builds the GSTR-1 payload.
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
          or upload to the GST portal. Period format: YYYY-MM (e.g.{' '}
          <code>2026-04</code> for April 2026). The server transposes to
          MMYYYY in the JSON payload itself.
        </p>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="gstr1-period">Period (YYYY-MM)</Label>
            <Input
              id="gstr1-period"
              value={period}
              // Strip anything except digits + dash, keep at most 7
              // chars (YYYY-MM = 7 chars). Native HTML5 month input
              // would be cleaner but Safari support is uneven and the
              // GSTR-1 portal users want a plain text field.
              onChange={(e) =>
                setPeriod(e.target.value.replace(/[^\d-]/g, '').slice(0, 7))
              }
              maxLength={7}
              placeholder="2026-04"
              className="w-32 font-mono"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={!/^\d{4}-\d{2}$/.test(period)}
          >
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
// 2026-05-09 (QA #232) — Form 16A certificate generator
// ---------------------------------------------------------------------------
// Picks a vendor + financial year and renders the TDS data the backend
// returns (`GET /tax/tds/form16a/:vendorId?financial_year_id=…`) as a
// print-friendly card. The operator clicks "Print" to drop a PDF via
// the browser's native print-to-PDF — no extra dependency, satisfies
// the compliance "I need a copy of this on letterhead" use case.
// ---------------------------------------------------------------------------

function Form16ACertificateSection(): ReactNode {
  const fyQuery = useFinancialYears();
  const vendorsQuery = useVendors({ limit: 500 });
  const [vendorId, setVendorId] = useState<string>('');
  const [fyId, setFyId] = useState<string>('');

  const currentFy = fyQuery.data?.find((fy) => fy.is_current);
  const effectiveFyId = fyId || currentFy?.id || '';

  const form16Query = useForm16A(vendorId, effectiveFyId);
  const enabled = !!vendorId && !!effectiveFyId;

  const certificate = enabled ? form16Query.data : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Form 16A — TDS Certificate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Picker row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="form16a-vendor">Vendor</Label>
            <Select
              id="form16a-vendor"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-72"
            >
              <option value="">Select vendor…</option>
              {vendorsQuery.data?.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.pan ? ` · PAN ${v.pan}` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="form16a-fy">Financial Year</Label>
            <Select
              id="form16a-fy"
              value={effectiveFyId}
              onChange={(e) => setFyId(e.target.value)}
              className="w-56"
            >
              {(fyQuery.data ?? []).map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.label}
                  {fy.is_current ? ' (current)' : ''}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!certificate}
            onClick={() => window.print()}
            title="Use 'Save as PDF' in the print dialog"
          >
            <Download className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>

        {/* Status messages */}
        {!enabled && (
          <p className="text-sm text-muted-foreground">
            Pick a vendor and financial year to generate the certificate.
          </p>
        )}
        {enabled && form16Query.isLoading && (
          <Skeleton className="h-32 w-full" />
        )}
        {enabled && form16Query.isError && (
          <p className="text-sm text-destructive">
            Failed to load certificate —{' '}
            {(form16Query.error as Error)?.message ?? 'unknown error'}.
          </p>
        )}
        {certificate && (
          <Form16ACertificatePreview data={certificate} />
        )}
      </CardContent>
    </Card>
  );
}

function Form16ACertificatePreview({ data }: { data: Form16AData }): ReactNode {
  // Print-friendly: white background, dark text, plain table layout.
  // Used together with `window.print()` for an on-letterhead PDF.
  return (
    <div className="rounded-lg border bg-white p-6 text-foreground shadow-sm print:border-0 print:shadow-none">
      <h2 className="text-center text-xl font-bold uppercase tracking-wide">
        Form 16A
      </h2>
      <p className="mb-4 text-center text-xs text-muted-foreground">
        Certificate of Tax Deducted at Source under section 203 of the
        Income-tax Act, 1961
      </p>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded border p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Deductor (Society)
          </p>
          <p className="font-medium">{data.deductor.name}</p>
          {data.deductor.tan && (
            <p className="text-xs">TAN: {data.deductor.tan}</p>
          )}
          {data.deductor.pan && (
            <p className="text-xs">PAN: {data.deductor.pan}</p>
          )}
        </div>
        <div className="rounded border p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Deductee (Vendor)
          </p>
          <p className="font-medium">{data.vendor.name}</p>
          {data.vendor.pan && (
            <p className="text-xs">PAN: {data.vendor.pan}</p>
          )}
          {data.vendor.address && (
            <p className="text-xs text-muted-foreground">{data.vendor.address}</p>
          )}
        </div>
      </div>

      <div className="mb-4 rounded border p-3 text-sm">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Financial Year
        </p>
        <p className="font-medium">
          {data.financial_year.label} ({formatDate(data.financial_year.start_date)}{' '}
          – {formatDate(data.financial_year.end_date)})
        </p>
      </div>

      {/* Deductions table */}
      <p className="mb-2 text-sm font-semibold">Deductions</p>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted">
            <th className="border p-2 text-left">Bill #</th>
            <th className="border p-2 text-left">Bill Date</th>
            <th className="border p-2 text-right">Amount Paid</th>
            <th className="border p-2 text-left">Section</th>
            <th className="border p-2 text-right">Rate</th>
            <th className="border p-2 text-right">TDS Deducted</th>
          </tr>
        </thead>
        <tbody>
          {data.deductions.map((d, idx) => (
            <tr key={`${d.bill_number}-${idx}`}>
              <td className="border p-2 font-mono">{d.bill_number}</td>
              <td className="border p-2">{formatDate(d.bill_date)}</td>
              <td className="border p-2 text-right">{formatCurrency(d.amount)}</td>
              <td className="border p-2">{d.tds_section}</td>
              <td className="border p-2 text-right">{d.tds_rate}%</td>
              <td className="border p-2 text-right font-medium">
                {formatCurrency(d.tds_amount)}
              </td>
            </tr>
          ))}
          {data.deductions.length === 0 && (
            <tr>
              <td colSpan={6} className="border p-4 text-center text-muted-foreground">
                No deductions recorded for this vendor in this FY.
              </td>
            </tr>
          )}
        </tbody>
        {data.deductions.length > 0 && (
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={2} className="border p-2 text-right">
                Total
              </td>
              <td className="border p-2 text-right">
                {formatCurrency(data.total_amount_paid)}
              </td>
              <td colSpan={2} className="border p-2"></td>
              <td className="border p-2 text-right">
                {formatCurrency(data.total_tds_deducted)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Challans table */}
      <p className="mt-6 mb-2 text-sm font-semibold">Challans (TDS Deposited)</p>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted">
            <th className="border p-2 text-left">Challan #</th>
            <th className="border p-2 text-left">Payment Date</th>
            <th className="border p-2 text-left">BSR Code</th>
            <th className="border p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.challans.map((c, idx) => (
            <tr key={`${c.challan_number}-${idx}`}>
              <td className="border p-2 font-mono">{c.challan_number}</td>
              <td className="border p-2">{formatDate(c.payment_date)}</td>
              <td className="border p-2 font-mono">{c.bsr_code ?? '—'}</td>
              <td className="border p-2 text-right">{formatCurrency(c.amount)}</td>
            </tr>
          ))}
          {data.challans.length === 0 && (
            <tr>
              <td colSpan={4} className="border p-4 text-center text-muted-foreground">
                No challans recorded yet.
              </td>
            </tr>
          )}
        </tbody>
        {data.challans.length > 0 && (
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={3} className="border p-2 text-right">
                Total Deposited
              </td>
              <td className="border p-2 text-right">
                {formatCurrency(data.total_tds_deposited)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <p>
          This is a system-generated certificate based on bills and
          payment records on file as of today.
        </p>
        <p>
          Signature: ____________________
        </p>
      </div>
    </div>
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
          {/* 2026-05-09 (QA #232) — Form 16A picker. The previous
              UI just told operators to "go to Vendors → Vendor
              detail" — that page never had the action wired. Now
              the operator picks a vendor + FY here, the
              certificate preview renders inline, and a "Print"
              button opens the browser's print dialog (Save as
              PDF works out of the box). A native PDF generator
              endpoint can come later; the print path unblocks
              compliance today. */}
          <Form16ACertificateSection />
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
