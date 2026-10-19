'use client';

import { type ReactNode } from 'react';
import { InvoicesRegister } from '@/components/income-registers/registers';
import { useAdminLayout } from '@/lib/layout-context';
import InvoicesContent from '../../../invoices/invoices-content';

export function InvoicesRegisterPage(): ReactNode {
  return useAdminLayout() === 'classic' ? <InvoicesRegister /> : <InvoicesContent />;
}
