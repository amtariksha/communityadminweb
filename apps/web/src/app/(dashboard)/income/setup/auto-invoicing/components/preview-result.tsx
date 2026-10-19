import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RuleLinePreview } from '@/hooks/use-billing-rules';
import { formatCurrency } from '@/lib/utils';

/** The computed invoice under the Preview form (INC-S4). */
export function PreviewResult({ preview }: { preview: RuleLinePreview }): ReactNode {
  return (
    <div className="space-y-2">
      {preview.warnings.map((warning) => (
        <p key={warning} role="status" className="text-sm text-amber-700 dark:text-amber-400">
          {warning}
        </p>
      ))}
      <Table aria-label="Preview invoice">
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">GST %</TableHead>
            <TableHead className="text-right">GST</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.lines
            .filter((line) => !line.round_off)
            .map((line) => (
              <TableRow key={line.rule_line_id ?? line.description}>
                <TableCell>{line.account_name}</TableCell>
                <TableCell>{line.description}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(line.amount))}</TableCell>
                <TableCell className="text-right">{Number(line.gst_rate)}%</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(line.gst_amount))}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(line.total))}</TableCell>
              </TableRow>
            ))}
          <TableRow>
            <TableCell colSpan={5}>Round off</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(preview.round_off))}</TableCell>
          </TableRow>
          <TableRow className="font-medium">
            <TableCell colSpan={5}>Invoice total</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(preview.total))}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={5}>Due date</TableCell>
            <TableCell className="text-right">{preview.due_date}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">Period: {preview.period.label}. Nothing has been saved.</p>
    </div>
  );
}
