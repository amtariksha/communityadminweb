'use client';

import { type ReactNode } from 'react';
import { Printer, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Asset } from '@/hooks/use-assets';

/**
 * What the badge encodes: the asset's QR value, which is its code (ASSET-13,
 * decision A4); an asset from before that keeps today's id-and-name value.
 */
export function assetQrValue(asset: Pick<Asset, 'id' | 'name' | 'qr_code' | 'asset_code'>): string {
  return asset.qr_code || asset.asset_code || `ASSET:${asset.id}:${asset.name}`;
}

/** The printable QR badge of an asset (both layouts). */
export function AssetQrDialog({ asset, onClose }: { asset: Asset | null; onClose: () => void }): ReactNode {
  return (
    <Dialog open={Boolean(asset)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Asset QR Badge
          </DialogTitle>
          <DialogDescription>Printable equipment verification badge for field scanning and inspection.</DialogDescription>
        </DialogHeader>
        {asset && (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border bg-card p-6">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <QRCodeSVG value={assetQrValue(asset)} size={180} level="H" />
            </div>
            <div className="space-y-1 text-center">
              <div className="text-base font-bold">{asset.name}</div>
              <div className="font-mono text-[11px] text-muted-foreground">{asset.asset_code ? `Code: ${asset.asset_code}` : `ID: ${asset.id}`}</div>
              <div className="text-xs font-medium text-muted-foreground">
                Location: {asset.location} · {asset.asset_type}
              </div>
              {asset.serial_number && <div className="text-xs text-muted-foreground">S/N: {asset.serial_number}</div>}
            </div>
          </div>
        )}
        <DialogFooter className="flex items-center gap-2">
          <DialogClose>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print QR Badge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
