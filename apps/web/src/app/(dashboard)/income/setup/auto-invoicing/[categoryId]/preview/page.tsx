'use client';

import { useParams, useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { useBillingRules } from '@/hooks/use-billing-rules';
import { PreviewInvoiceForm } from '../../components/preview-invoice-form';
import { AUTO_INVOICING_HREF, usePreviewDefaults } from '../../components/rule-book';

// Setup › Auto Invoicing › Preview Invoice as a page (classic, INC-S4).
export default function PreviewInvoicePage(): ReactNode {
  const { categoryId } = useParams<{ categoryId: string }>();
  const router = useRouter();
  const rules = useBillingRules();
  const defaults = usePreviewDefaults();
  const group = rules.data?.data.find((g) => g.category.id === categoryId);
  if (rules.isLoading) return null;
  if (!group) return <p className="text-sm text-muted-foreground">This unit type was not found.</p>;
  return (
    <PreviewInvoiceForm
      mode="page"
      onClose={() => router.push(AUTO_INVOICING_HREF)}
      category={group.category}
      defaultDate={defaults.date}
      defaultGraceDays={defaults.graceDays}
    />
  );
}
