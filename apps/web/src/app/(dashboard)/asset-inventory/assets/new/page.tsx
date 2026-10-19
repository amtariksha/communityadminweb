'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { ASSETS_BASE } from '@/lib/asset-statuses';
import { AssetForm } from '../../../assets/asset-form';

// Asset & Inventory › Add Asset (ASSET-S6), a page of its own (SB-07).
export default function Page(): ReactNode {
  const router = useRouter();
  const list = `${ASSETS_BASE}/active`;
  return <AssetForm mode="page" onClose={() => router.push(list)} onSaved={() => router.push(list)} />;
}
