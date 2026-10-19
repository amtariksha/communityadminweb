import { Suspense, type ReactNode } from 'react';
import { VendorStatementPage } from './vendor-statement-page';

// Expense Tracker › By Vendors › Account statement (EXP-15, screen EXP-S10).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <VendorStatementPage />
    </Suspense>
  );
}
