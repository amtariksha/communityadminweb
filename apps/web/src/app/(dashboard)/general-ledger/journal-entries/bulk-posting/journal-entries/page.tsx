import { Suspense, type ReactNode } from 'react';
import { GL_JOURNAL_COLUMNS } from '../../../gl-imports';
import { GlUploadPage } from '../gl-upload-page';

// General Ledger › Journal Entries › Bulk Posting › Batch Upload Journal Entries From Excel (GL-24).
export default function JournalEntriesUploadPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <GlUploadPage
        type="gl_journal"
        title="Batch Upload Journal Entries"
        description="One row per line; rows with the same Journal No. are one entry, which must balance and be dated in an open financial year. Any row with an error stops the posting."
        columns={GL_JOURNAL_COLUMNS}
        closeTo="/general-ledger/journal-entries/bulk-posting"
      />
    </Suspense>
  );
}
