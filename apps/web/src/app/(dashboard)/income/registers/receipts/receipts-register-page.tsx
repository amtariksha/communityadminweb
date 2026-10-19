'use client';

import { type ReactNode } from 'react';
import { ReceiptsRegister } from '@/components/income-registers/registers';
import { useAdminLayout } from '@/lib/layout-context';
import ReceiptsContent from '../../../receipts/receipts-content';

export function ReceiptsRegisterPage(): ReactNode {
  return useAdminLayout() === 'classic' ? <ReceiptsRegister /> : <ReceiptsContent />;
}
