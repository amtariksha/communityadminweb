'use client';

import { useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { financialDateBounds } from '@/lib/utils';
import { useTallyExportPreview, useTallyExport } from '@/hooks/use-tally-export';
import type { TallyExportOptions } from '@/hooks/use-tally-export';

interface TallyExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Export to Tally (moved out of accounts-content.tsx, GL-12): a dated XML of groups, ledgers and vouchers. */
export function TallyExportDialog({ open, onOpenChange }: TallyExportDialogProps): ReactNode {
  const { addToast } = useToast();
  const dateBounds = financialDateBounds();
  const tallyExportDialogOpen = open;
  const setTallyExportDialogOpen = onOpenChange;
  // -- Tally export state --
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [exportGroups, setExportGroups] = useState(true);
  const [exportLedgers, setExportLedgers] = useState(true);
  const [exportVouchers, setExportVouchers] = useState(true);
  const [exportAuditTrail, setExportAuditTrail] = useState(false);

  const tallyExportOptions: TallyExportOptions = {
    from_date: exportFromDate,
    to_date: exportToDate,
    include_groups: exportGroups,
    include_ledgers: exportLedgers,
    include_vouchers: exportVouchers,
    include_audit_trail: exportAuditTrail,
  };

  const { data: exportPreview } = useTallyExportPreview(tallyExportOptions);
  const tallyExport = useTallyExport();

  function handleTallyExport(): void {
    if (!exportFromDate || !exportToDate) {
      addToast({ title: 'Select date range', variant: 'destructive' });
      return;
    }
    tallyExport.mutate(tallyExportOptions, {
      onSuccess() {
        addToast({ title: 'Tally XML downloaded', variant: 'success' });
        setTallyExportDialogOpen(false);
      },
      onError(err) {
        addToast({ title: 'Export failed', description: friendlyError(err), variant: 'destructive' });
      },
    });
  }
  return (
    <>
      {/* Tally Export Dialog */}
      <Dialog open={tallyExportDialogOpen} onOpenChange={setTallyExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export to Tally</DialogTitle>
            <DialogDescription>Generate a Tally-compatible XML file for import</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="export-from">From Date *</Label>
                <Input
                  id="export-from"
                  type="date"
                  min={dateBounds.min}
                  max={dateBounds.max}
                  value={exportFromDate}
                  onChange={(e) => setExportFromDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="export-to">To Date *</Label>
                <Input
                  id="export-to"
                  type="date"
                  min={dateBounds.min}
                  max={dateBounds.max}
                  value={exportToDate}
                  onChange={(e) => setExportToDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label>Include</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportGroups}
                    onChange={(e) => setExportGroups(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Account Groups
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportLedgers}
                    onChange={(e) => setExportLedgers(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Ledger Accounts
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportVouchers}
                    onChange={(e) => setExportVouchers(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Vouchers
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportAuditTrail}
                    onChange={(e) => setExportAuditTrail(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Include audit trail
                </label>
              </div>
            </div>
            {exportPreview && exportFromDate && exportToDate && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium mb-2">Preview</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{exportPreview.groups_count}</p>
                    <p className="text-xs text-muted-foreground">Groups</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{exportPreview.ledgers_count}</p>
                    <p className="text-xs text-muted-foreground">Ledgers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{exportPreview.vouchers_count}</p>
                    <p className="text-xs text-muted-foreground">Vouchers</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleTallyExport}
              disabled={tallyExport.isPending || !exportFromDate || !exportToDate}
            >
              <Download className="mr-2 h-4 w-4" />
              {tallyExport.isPending ? 'Exporting...' : 'Download XML'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
