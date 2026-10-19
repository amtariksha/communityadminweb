'use client';

import { useParams, useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { useBillingRules } from '@/hooks/use-billing-rules';
import { CloneRulesForm } from '../../components/clone-rules-form';
import { AUTO_INVOICING_HREF } from '../../components/rule-book';

// Setup › Auto Invoicing › Clone Rules as a page (classic, INC-S4).
export default function CloneRulesPage(): ReactNode {
  const { categoryId } = useParams<{ categoryId: string }>();
  const router = useRouter();
  const rules = useBillingRules();
  const group = rules.data?.data.find((g) => g.category.id === categoryId);
  if (rules.isLoading) return null;
  if (!group) return <p className="text-sm text-muted-foreground">This unit type was not found.</p>;
  const back = (): void => router.push(AUTO_INVOICING_HREF);
  return (
    <CloneRulesForm
      mode="page"
      onClose={back}
      onCloned={back}
      source={group.category}
      types={(rules.data?.data ?? []).map((g) => g.category)}
    />
  );
}
