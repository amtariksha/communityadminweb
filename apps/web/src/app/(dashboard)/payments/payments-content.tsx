'use client';

import { useState, type ReactNode } from 'react';
import {
  IndianRupee,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
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
import { ExportButton } from '@/components/ui/export-button';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { TOOLTIP } from '@/lib/tooltip-content';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  usePayments,
  usePayment,
  usePaymentStats,
  useInitiateRefund,
} from '@/hooks';
import type { Payment } from '@/hooks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'paid':
      return 'success';
    case 'created':
      return 'warning';
    case 'failed':
      return 'destructive';
    case 'refunded':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function getDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = start.toISOString().split('T')[0];
  return { startDate, endDate };
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PaymentsContent(): ReactNode {
  const { addToast } = useToast();
  const PAGE_SIZE = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Detail dialog
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  // Stats date range — current month
  const statsRange = getDateRange();

  // Queries
  const paymentsQuery = usePayments({
    status: statusFilter || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });
  const statsQuery = usePaymentStats(statsRange.startDate, statsRange.endDate);
  const paymentDetailQuery = usePayment(selectedPaymentId);
  const refundMutation = useInitiateRefund();

  const payments = paymentsQuery.data?.data ?? [];
  const total = paymentsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const stats = statsQuery.data;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleViewPayment(payment: Payment): void {
    setSelectedPaymentId(payment.id);
    setDetailOpen(true);
  }

  function handleRefund(paymentId: string): void {
    refundMutation.mutate(
      { id: paymentId },
      {
        onSuccess() {
          addToast({ title: 'Refund initiated successfully', variant: 'success' });
          setDetailOpen(false);
          setSelectedPaymentId('');
        },
        onError(error) {
          addToast({
            title: 'Failed to initiate refund',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleClearFilters(): void {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  }

  const detail = paymentDetailQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Payments' }]}
        title="Payments"
        description="Online payment collection via Razorpay — orders, settlements, refunds"
        actions={
          <ExportButton
            data={payments as unknown as Record<string, unknown>[]}
            filename={`payments-${new Date().toISOString().split('T')[0]}`}
            columns={[
              { key: 'order_id', label: 'Order ID' },
              { key: 'unit_number', label: 'Unit' },
              { key: 'amount', label: 'Amount' },
              { key: 'status', label: 'Status' },
              { key: 'method', label: 'Method' },
              { key: 'created_at', label: 'Date' },
            ]}
          />
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsQuery.isLoading ? (
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
                  Total Collected
                  <HelpTooltip text={TOOLTIP.payments.totalCollected} side="bottom" />
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.total_collected ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  Platform Fees
                  <HelpTooltip text={TOOLTIP.payments.platformFees} side="bottom" />
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.total_platform_fees ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">Razorpay charges</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  Successful
                  <HelpTooltip text={TOOLTIP.payments.successfulCount} side="bottom" />
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.successful_count ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Transactions this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  Failed
                  <HelpTooltip text={TOOLTIP.payments.failedCount} side="bottom" />
                </CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.failed_count ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Transactions this month</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-status" className="flex items-center gap-1">
                Status
                <HelpTooltip text={TOOLTIP.payments.status} />
              </Label>
              <Select
                id="payment-status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All</option>
                <option value="created">Created</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-start">From</Label>
              <Input
                id="payment-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-end">To</Label>
              <Input
                id="payment-end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Transactions</CardTitle>
            <p className="text-sm text-muted-foreground">
              {total} total
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Razorpay ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  </TableRow>
                ))
              ) : payments.length > 0 ? (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(payment.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.razorpay_payment_id ?? payment.razorpay_order_id ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(payment.platform_fee)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {payment.payment_method ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewPayment(payment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No payments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment detail dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setSelectedPaymentId(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              {detail?.razorpay_payment_id ?? detail?.razorpay_order_id ?? 'Loading...'}
            </DialogDescription>
          </DialogHeader>

          {paymentDetailQuery.isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : detail ? (
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">Status</span>
                <span>
                  <Badge variant={getStatusBadgeVariant(detail.status)}>
                    {detail.status}
                  </Badge>
                </span>

                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatCurrency(detail.amount)}</span>

                <span className="text-muted-foreground">Platform Fee</span>
                <span>{formatCurrency(detail.platform_fee)}</span>

                <span className="text-muted-foreground">Payment Method</span>
                <span className="capitalize">{detail.payment_method ?? '—'}</span>

                <span className="text-muted-foreground">Razorpay Order</span>
                <span className="font-mono text-xs break-all">{detail.razorpay_order_id ?? '—'}</span>

                <span className="text-muted-foreground">Razorpay Payment</span>
                <span className="font-mono text-xs break-all">{detail.razorpay_payment_id ?? '—'}</span>

                <span className="text-muted-foreground">Invoices</span>
                <span>{detail.invoice_ids?.length ?? 0} invoice(s)</span>

                {detail.receipt_id && (
                  <>
                    <span className="text-muted-foreground">Receipt</span>
                    <span className="font-mono text-xs">{detail.receipt_id}</span>
                  </>
                )}

                {detail.refund_amount !== null && detail.refund_amount > 0 && (
                  <>
                    <span className="text-muted-foreground">Refund Amount</span>
                    <span className="text-destructive font-medium">
                      {formatCurrency(detail.refund_amount)}
                    </span>
                  </>
                )}

                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(detail.created_at)}</span>

                <span className="text-muted-foreground">Updated</span>
                <span>{formatDate(detail.updated_at)}</span>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {detail?.status === 'paid' && (
              <Button
                variant="destructive"
                size="sm"
                disabled={refundMutation.isPending}
                onClick={() => handleRefund(detail.id)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {refundMutation.isPending ? 'Processing...' : 'Initiate Refund'}
              </Button>
            )}
            <DialogClose>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
