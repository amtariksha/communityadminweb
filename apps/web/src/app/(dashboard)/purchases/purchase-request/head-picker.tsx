'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ExpenseHeadSummary } from '@/hooks/use-purchase-requests';

function money(value: string | null): string {
  if (value === null) return '—';
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * "+ Add account head" (EXP-S6): the society's expense heads with a search
 * box and, beside each, its budget and what is booked on it this year
 * (budget shows "—" until budgets exist, EXP-21). Picking one adds a line.
 */
export function HeadPicker(props: {
  open: boolean;
  heads: readonly ExpenseHeadSummary[];
  onPick: (head: ExpenseHeadSummary) => void;
  onClose: () => void;
}): ReactNode {
  const [search, setSearch] = useState('');
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return props.heads;
    return props.heads.filter((head) =>
      [head.code, head.name, head.hsn_sac ?? '', head.group_name].some((text) => text.toLowerCase().includes(term)),
    );
  }, [props.heads, search]);

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add account head</DialogTitle>
        </DialogHeader>
        <Input type="search" aria-label="Search expense heads" placeholder="Code, name or HSN/SAC" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Table aria-label="Expense heads">
          <TableHeader>
            <TableRow>
              <TableHead>Account No.</TableHead>
              <TableHead>Expense Head</TableHead>
              <TableHead className="text-right">Budget (this year)</TableHead>
              <TableHead className="text-right">Booked (this year)</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No matching expense heads
                </TableCell>
              </TableRow>
            )}
            {shown.map((head) => (
              <TableRow key={head.ledger_account_id}>
                <TableCell className="font-mono text-xs">{head.code}</TableCell>
                <TableCell>{head.name}</TableCell>
                <TableCell className="text-right tabular-nums">{money(head.budget_amount)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(head.booked_amount)}</TableCell>
                <TableCell>
                  <Button type="button" size="sm" variant="outline" aria-label={`Add ${head.name}`} onClick={() => props.onPick(head)}>
                    Add
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
