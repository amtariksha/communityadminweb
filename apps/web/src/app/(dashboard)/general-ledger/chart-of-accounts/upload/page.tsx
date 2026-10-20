import { Suspense, type ReactNode } from 'react';
import { GL_ACCOUNT_COLUMNS } from '../../gl-imports';
import { GlUploadPage } from '../../journal-entries/bulk-posting/gl-upload-page';

// General Ledger › Chart of Accounts › Upload accounts (GL-24, the "Upload" of GL-S1 to GL-S4).
export default function AccountsUploadPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <GlUploadPage
        type="gl_account"
        title="Upload Accounts"
        description="One row per new account: Group Code, GL Account No., Account Name and an opening balance on the group's natural side. Codes and names already used are refused."
        columns={GL_ACCOUNT_COLUMNS}
        closeTo="/general-ledger/chart-of-accounts/assets"
      />
    </Suspense>
  );
}
