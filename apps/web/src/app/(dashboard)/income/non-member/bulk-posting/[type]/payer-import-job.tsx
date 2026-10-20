'use client';

import { type ReactNode } from 'react';
import { IncomeImportJob } from '../../../members/bulk-posting/[type]/import-job';
import { PAYER_BULK_POSTING_HREF, payerImport } from '../payer-imports';

/** One Non Member Income bulk posting (INC-62). */
export function PayerImportJob(): ReactNode {
  return <IncomeImportJob find={payerImport} closeHref={PAYER_BULK_POSTING_HREF} />;
}
