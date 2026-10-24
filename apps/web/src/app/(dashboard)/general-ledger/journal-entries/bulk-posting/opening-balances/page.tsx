import { Suspense, type ReactNode } from 'react';
import { GL_OPENING_COLUMNS } from '../../../gl-imports';
import { GlUploadPage } from '../gl-upload-page';

// General Ledger › Journal Entries › Bulk Posting › Batch Upload Opening Balance From Excel (GL-24).
export default function OpeningBalancesUploadPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <GlUploadPage
        type="gl_opening_balance"
        title="Batch Upload Opening Balances"
        description="One row per account: GL Account No., Opening Balance, Dr/Cr and Opening Balance Date. Each change posts an opening-balance entry against Retained Earnings (Opening) on the row's date (in a year that is not frozen, on or after the accounting start date; blank: the account's own date, else the start of the year); a balance already set posts nothing."
        columns={GL_OPENING_COLUMNS}
        closeTo="/general-ledger/journal-entries/bulk-posting"
      />
    </Suspense>
  );
}
