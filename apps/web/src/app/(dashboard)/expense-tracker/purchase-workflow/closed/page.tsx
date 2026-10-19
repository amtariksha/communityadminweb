import { type ReactNode } from 'react';
import { ClosedRequests } from './closed-requests';

// Expense Tracker › Purchase Workflow › Closed Purchase Request (EXP-S5, EXP-09).
export default function Page(): ReactNode {
  return <ClosedRequests />;
}
