import Link from 'next/link';
import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { AssetPart } from '@/hooks/use-asset-register';
import { ASSET_STATUS_WORDS, ASSETS_BASE } from '@/lib/asset-statuses';
import { formatCurrency } from '@/lib/utils';

/**
 * Parts (ASSET-18): the assets that are sub-components of this one. A part
 * is added from its own page by choosing this asset as its Parent Asset.
 * Absent from an API older than ASSET-18.
 */
export function AssetParts({ parts }: { parts?: AssetPart[] }): ReactNode {
  if (!parts) return null;
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <h3 className="font-semibold">Parts</h3>
        {parts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No parts. To add one, open the part and choose this asset as its Parent Asset.</p>
        ) : (
          <ul aria-label="Parts" className="space-y-1 text-sm">
            {parts.map((part) => (
              <li key={part.id} className="flex flex-wrap gap-2">
                <Link className="font-medium text-primary hover:underline" href={`${ASSETS_BASE}/${part.id}`}>
                  {part.name}
                </Link>
                {part.asset_code && <span className="font-mono text-muted-foreground">{part.asset_code}</span>}
                <span className="text-muted-foreground">{ASSET_STATUS_WORDS[part.status as keyof typeof ASSET_STATUS_WORDS] ?? part.status}</span>
                {part.purchase_cost != null && <span>{formatCurrency(Number(part.purchase_cost))}</span>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
