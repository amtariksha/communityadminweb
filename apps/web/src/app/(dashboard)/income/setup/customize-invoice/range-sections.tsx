'use client';

import { useMemo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDocumentRanges, type RangeKind, type RangeSeries } from '@/hooks/use-billing-documents';
import { canWriteFinance } from '@/lib/finance-roles';
import { isNotDeployed } from '@/lib/not-deployed';
import { RangeTable } from './ranges/range-table';

const FOOTERS: ReadonlyArray<[RangeSeries, string, string]> = [
  ['member_invoice', 'Footer – Member Income Invoice', 'Invoice#'],
  ['member_receipt', 'Footer – Member Income Receipt', 'Receipt#'],
  ['utility_invoice', 'Footer – Utility Income', 'Invoice#'],
  ['non_member_invoice', 'Footer – Non Member Income Invoice', 'Invoice#'],
  ['non_member_receipt', 'Footer – Non Member Income Receipt', 'Receipt#'],
];

const INVOICE_GRIDS: ReadonlyArray<[RangeKind, string]> = [
  ['period', 'Invoice Period & Frequency'],
  ['prefix', 'Prefix Invoice With'],
  ['header_title', 'Invoice Header Title'],
];

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardHeader>
      <CardContent className="space-y-8">{children}</CardContent>
    </Card>
  );
}

/**
 * Customize Invoice's number ranges (INC-40): a footer per document series,
 * and the member invoices' period wording, prefix and header title — each
 * applying to the documents whose number falls in the range. Finance
 * writers change them; other finance roles see them.
 */
export function RangeSections(): ReactNode {
  const canWrite = useMemo(() => canWriteFinance(), []);
  // One probe: a server without the ranges route answers 404 for every table.
  const probe = useDocumentRanges('member_invoice', 'footer');
  if (isNotDeployed(probe.error)) {
    return <p className="text-sm text-muted-foreground">Footers, prefixes and titles by number range are not available yet on this server.</p>;
  }
  return (
    <>
      <Section
        title="Footers"
        note={'Printed at the foot of each document whose number falls in the range. One paragraph per line; <b>, <i>, <u>, <sub>, <sup> and lists may be typed.'}
      >
        {FOOTERS.map(([series, title, numberLabel]) => (
          <RangeTable key={series} series={series} kind="footer" title={title} numberLabel={numberLabel} canWrite={canWrite} />
        ))}
      </Section>
      <Section title="Member invoice ranges" note={"The period wording ({from} and {to} become the period's dates), number prefix and header title of member invoices."}>
        {INVOICE_GRIDS.map(([kind, title]) => (
          <RangeTable key={kind} series="member_invoice" kind={kind} title={title} numberLabel="Invoice#" canWrite={canWrite} />
        ))}
      </Section>
    </>
  );
}
