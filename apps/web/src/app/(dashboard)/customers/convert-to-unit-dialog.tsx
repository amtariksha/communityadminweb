'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';
import { useUnits, useConvertCustomerToUnit } from '@/hooks';

// ---------------------------------------------------------------------------
// Sundry-Debtor → unit converter dialog (Phase C.3)
// ---------------------------------------------------------------------------
//
// After Tally migration, an operator commonly has a "Sundry Debtors"
// child ledger that's actually a resident family — e.g. customer
// "A-204 Pradeep Kumar" with ₹15,000 outstanding. The accountant
// wants A-204's unit-receivables aging to show that ₹15,000.
//
// This dialog runs the migration:
//   1. Operator picks the target unit + an opening-balance income
//      ledger (defaults to Other Income).
//   2. POST /customers/:id/convert-to-unit fires.
//   3. Backend posts a transfer JE (DR member_receivable, CR
//      customer's ledger), creates an opening invoice on the unit
//      with status='sent', and deactivates the customer.
//
// Backend service: customer.service.convertToUnit.
// ---------------------------------------------------------------------------

interface ConvertToUnitDialogProps {
  customerId: string;
  customerName: string;
  customerOutstanding: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: () => void;
}

export function ConvertToUnitDialog({
  customerId,
  customerName,
  customerOutstanding,
  open,
  onOpenChange,
  onConverted,
}: ConvertToUnitDialogProps): ReactNode {
  const { addToast } = useToast();
  const [unitId, setUnitId] = useState('');
  const [openingAccountId, setOpeningAccountId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');

  const unitsQuery = useUnits({ limit: 500 });
  const convert = useConvertCustomerToUnit();

  useEffect(() => {
    if (!open) return;
    setUnitId('');
    setOpeningAccountId('');
    setInvoiceDate(new Date().toISOString().slice(0, 10));
  }, [open]);

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!unitId) {
      addToast({
        title: 'Pick the target unit',
        variant: 'destructive',
      });
      return;
    }

    convert.mutate(
      {
        id: customerId,
        data: {
          unit_id: unitId,
          opening_income_account_id: openingAccountId || undefined,
          invoice_date: invoiceDate || undefined,
        },
      },
      {
        onSuccess(res) {
          const summary = res.data;
          addToast({
            title:
              summary.invoice_number != null
                ? `Migrated: opening invoice ${summary.invoice_number} created`
                : 'Customer deactivated (no balance to migrate)',
            description:
              Math.abs(summary.transferred_amount) >= 0.01
                ? `Transferred ${formatCurrency(Math.abs(summary.transferred_amount))} to the unit's receivables.`
                : undefined,
            variant: 'success',
          });
          onOpenChange(false);
          onConverted?.();
        },
        onError(err) {
          addToast({
            title: 'Conversion failed',
            description: friendlyError(err),
            variant: 'destructive',
          });
        },
      },
    );
  }

  // Map the units response shape to what UnitSearchSelect expects.
  const units = (unitsQuery.data?.data ?? []).map(
    (u: { id: string; unit_number: string; block?: string | null }) => ({
      id: u.id,
      unit_number: u.unit_number,
      block: u.block ?? null,
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Convert to unit</DialogTitle>
            <DialogDescription>
              Migrate <strong>{customerName}</strong> (outstanding{' '}
              {formatCurrency(customerOutstanding)}) to a resident unit.
              Creates an opening invoice on the unit and zeros the customer
              ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target unit</Label>
              <UnitSearchSelect
                value={unitId}
                onChange={setUnitId}
                units={units}
                placeholder="Pick the unit this customer maps to…"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Opening-balance income ledger{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (defaults to Other Income)
                </span>
              </Label>
              <AccountSearchSelect
                value={openingAccountId}
                onChange={setOpeningAccountId}
                accountType={['income']}
                placeholder="Pick (e.g. Opening Balance Adjustment)…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ctu-date">Opening invoice date</Label>
              <Input
                id="ctu-date"
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <strong>What happens:</strong> Posts a transfer JE
              (DR Member Receivable, CR {customerName}). Creates a
              status=&quot;sent&quot; opening invoice on the unit for the
              outstanding balance. Marks the customer inactive. Historical
              JE&apos;s on the customer ledger are preserved unchanged.
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!unitId || convert.isPending}>
              {convert.isPending ? 'Converting…' : 'Convert + create opening invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
