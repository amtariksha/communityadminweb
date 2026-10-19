import { type ReactNode } from 'react';
import { PurchaseRequestPage } from '../purchase-request-page';

// Expense Tracker › Purchase Workflow › a request: view, or edit while it is your draft (EXP-S6).
export default async function Page({ params }: { params: Promise<{ id: string }> }): Promise<ReactNode> {
  const { id } = await params;
  return <PurchaseRequestPage requestId={id} />;
}
