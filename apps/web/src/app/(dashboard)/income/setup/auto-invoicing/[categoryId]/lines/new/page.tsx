'use client';

import { useParams, useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { useBillingRules } from '@/hooks/use-billing-rules';
import { AUTO_INVOICING_HREF } from '../../../components/rule-book';
import { RuleLineForm } from '../../../components/rule-line-form';

// Setup › Auto Invoicing › Add Line Item as a page (classic, SB-07).
export default function AddRuleLinePage(): ReactNode {
  const { categoryId } = useParams<{ categoryId: string }>();
  const router = useRouter();
  const rules = useBillingRules();
  const group = rules.data?.data.find((g) => g.category.id === categoryId);
  if (rules.isLoading) return null;
  if (!group) return <p className="text-sm text-muted-foreground">This unit type was not found.</p>;
  const back = (): void => router.push(AUTO_INVOICING_HREF);
  return <RuleLineForm mode="page" onClose={back} onSaved={back} category={group.category} />;
}
