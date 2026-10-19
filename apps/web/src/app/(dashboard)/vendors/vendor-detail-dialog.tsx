'use client';

import type { ReactNode } from 'react';
import { Pencil, XCircle } from 'lucide-react';
import type { Vendor } from '@communityos/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClickableEmail, ClickablePhone } from '@/components/ui/clickable-contact';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useVendor } from '@/hooks';
import { tdsText, vendorBank } from './vendor-form';

interface VendorDetailDialogProps {
  vendorId: string | null;
  onClose: () => void;
  onEdit: (vendorId: string) => void;
  onDeactivate: (vendorId: string) => void;
  deactivating: boolean;
}

function Item({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="font-medium">{children}</div>
    </div>
  );
}

function BankBlock({ vendor }: { vendor: Vendor }): ReactNode {
  const bank = vendorBank(vendor);
  if (!bank.name && !bank.account) return null;
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-muted-foreground">Bank Details</p>
      <div className="rounded-md border p-3 text-sm">
        <p>
          {bank.name || '-'}
          {bank.branch ? ` — ${bank.branch}` : ''}
        </p>
        <p className="font-mono">{bank.account || '-'}</p>
        <p>IFSC: {bank.ifsc || '-'}</p>
      </div>
    </div>
  );
}

function VendorFacts({ vendor }: { vendor: Vendor }): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Item label="Name">{vendor.name}</Item>
      <Item label="Contact Name">{vendor.contact_person ?? '-'}</Item>
      <Item label="PAN"><span className="font-mono text-sm">{vendor.pan ?? '-'}</span></Item>
      <Item label="GSTIN"><span className="font-mono text-sm">{vendor.gstin ?? 'Not registered'}</span></Item>
      <Item label="Phone"><ClickablePhone phone={vendor.phone} /></Item>
      <Item label="Email"><ClickableEmail email={vendor.email} /></Item>
      <Item label="TDS">{tdsText(vendor)}</Item>
      <Item label="Billing Address"><span className="whitespace-pre-line text-sm">{vendor.address || '-'}</span></Item>
    </div>
  );
}

export function VendorDetailDialog({ vendorId, onClose, onEdit, onDeactivate, deactivating }: VendorDetailDialogProps): ReactNode {
  const vendorQuery = useVendor(vendorId ?? '');
  const vendor = vendorQuery.data;
  return (
    <Dialog open={vendorId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vendor Details</DialogTitle>
        </DialogHeader>
        {vendorQuery.isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : vendor ? (
          <div className="space-y-4 py-4">
            <VendorFacts vendor={vendor} />
            <BankBlock vendor={vendor} />
            <div className="flex items-center justify-between">
              <Badge variant={vendor.is_active ? 'success' : 'secondary'}>{vendor.is_active ? 'Active' : 'Inactive'}</Badge>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(vendor.id)}>
                  <Pencil className="mr-1 h-4 w-4" /> {vendor.is_active ? 'Edit' : 'Edit / Re-activate'}
                </Button>
                {vendor.is_active && (
                  <Button variant="outline" size="sm" className="text-destructive" disabled={deactivating} onClick={() => onDeactivate(vendor.id)}>
                    <XCircle className="mr-1 h-4 w-4" /> {deactivating ? 'Deactivating...' : 'Deactivate'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose><Button variant="outline">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
