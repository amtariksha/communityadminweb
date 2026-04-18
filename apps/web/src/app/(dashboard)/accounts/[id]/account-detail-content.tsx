'use client';

import { use, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLedgerAccount, useGeneralLedgerReport, useAccountGroups } from '@/hooks';

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const fyStartMonth = 3; // April (0-indexed)
  const fyStartYear = now.getMonth() >= fyStartMonth ? now.getFullYear() : now.getFullYear() - 1;
  const startDate = new Date(fyStartYear, fyStartMonth, 1).toISOString().split('T')[0];
  const endDate = now.toISOString().split('T')[0];
  return { startDate, endDate };
}

function InfoCardSkeleton(): ReactNode {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32" />
      </CardContent>
    </Card>
  );
}

function TableRowSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AccountDetailContent({ params }: AccountDetailPageProps): ReactNode {
  const { id } = use(params);
  const defaults = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);

  const { data: account, isLoading: accountLoading } = useLedgerAccount(id);
  const { data: report, isLoading: reportLoading } = useGeneralLedgerReport(id, startDate, endDate);
  const { data: groups } = useAccountGroups();

  const accountGroup = groups?.find((g) => g.id === account?.group_id);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Accounts', href: '/accounts' }, { label: 'Account Detail' }]}
        title={accountLoading ? 'Loading...' : (account?.name ?? 'Account Detail')}
        description={account ? `Account Code: ${account.code}` : undefined}
        actions={
          <Link href="/accounts">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Accounts
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {accountLoading ? (
          <>
            <InfoCardSkeleton />
            <InfoCardSkeleton />
            <InfoCardSkeleton />
          </>
        ) : account ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Opening Balance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(account.opening_balance)}</p>
                <Badge variant="outline" className="mt-1">
                  {account.balance_type === 'debit' ? 'Debit' : 'Credit'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Closing Balance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {report ? formatCurrency(report.closing_balance) : '--'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Group</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{accountGroup?.name ?? '--'}</p>
                <p className="text-sm text-muted-foreground">
                  {accountGroup?.type ? accountGroup.type.charAt(0).toUpperCase() + accountGroup.type.slice(1) : ''}
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="md:col-span-3">
            <CardContent className="py-8 text-center text-muted-foreground">
              Account not found
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Transaction History</CardTitle>
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <Label htmlFor="start-date" className="text-xs">From</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onKeyDown={(e) => e.preventDefault()}
                  className="h-8 w-36 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date" className="text-xs">To</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onKeyDown={(e) => e.preventDefault()}
                  className="h-8 w-36 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
              {reportLoading ? (
                <TableRowSkeleton />
              ) : report && report.transactions.length > 0 ? (
                report.transactions.map((txn, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(txn.entry_date)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{txn.entry_number}</span>
                    </TableCell>
                    <TableCell className="font-medium">{txn.narration}</TableCell>
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No transactions found for the selected period
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
