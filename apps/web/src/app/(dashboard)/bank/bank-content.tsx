'use client';

import { useState, type ReactNode } from 'react';
import { ArrowRightLeft, CreditCard, FileCheck, FileUp, Landmark, PiggyBank } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { useBankAccounts } from '@/hooks';
import { useAllLedgerAccounts } from '@/hooks/use-chart-of-accounts';
import { AccountsTab } from './accounts-tab';
import type { BankAccountRow } from './bank-types';
import { ChequesTab } from './cheques-tab';
import { FixedDepositsTab } from './fixed-deposits-tab';
import { ReconciliationTab } from './reconciliation-tab';
import { StatementImportTab } from './statement-import-tab';
import { TransfersTab } from './transfers-tab';

type ActiveTab = 'accounts' | 'transfers' | 'reconciliation' | 'statement-import' | 'fixed-deposits' | 'cheques';

const TABS: Array<{ key: ActiveTab; label: string; icon: ReactNode }> = [
  { key: 'accounts', label: 'Accounts', icon: <Landmark className="mr-2 inline-block h-4 w-4" /> },
  { key: 'transfers', label: 'Transfers', icon: <ArrowRightLeft className="mr-2 inline-block h-4 w-4" /> },
  { key: 'reconciliation', label: 'Reconciliation', icon: <FileCheck className="mr-2 inline-block h-4 w-4" /> },
  { key: 'statement-import', label: 'Statement Import', icon: <FileUp className="mr-2 inline-block h-4 w-4" /> },
  { key: 'fixed-deposits', label: 'Fixed Deposits', icon: <PiggyBank className="mr-2 inline-block h-4 w-4" /> },
  { key: 'cheques', label: 'Cheques', icon: <CreditCard className="mr-2 inline-block h-4 w-4" /> },
];

const EXPORT_COLUMNS = [
  { key: 'bank_name', label: 'Bank Name' },
  { key: 'account_number', label: 'Account Number' },
  { key: 'ifsc_code', label: 'IFSC' },
  { key: 'account_type', label: 'Type' },
  { key: 'branch', label: 'Branch' },
  { key: 'current_balance', label: 'Balance' },
];

/**
 * /bank (standard layout): one page with a tab per area. Each tab is its
 * own component, which the classic Bank & Cash pages reuse (BANK-06).
 */
export default function BankContent(): ReactNode {
  const [activeTab, setActiveTab] = useState<ActiveTab>('accounts');
  const accountsQuery = useBankAccounts();
  const accounts = (accountsQuery.data ?? []) as unknown as BankAccountRow[];
  const ledgerAccounts = useAllLedgerAccounts().data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Bank' }]}
        title="Bank & Treasury"
        description="Bank accounts, transfers, reconciliation, fixed deposits, and cheque management"
        actions={
          <ExportButton
            data={accounts as unknown as Record<string, unknown>[]}
            filename={`bank-accounts-${new Date().toISOString().split('T')[0]}`}
            columns={EXPORT_COLUMNS}
          />
        }
      />
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'accounts' && <AccountsTab accounts={accounts} loading={accountsQuery.isLoading} />}
      {activeTab === 'transfers' && <TransfersTab accounts={accounts} />}
      {activeTab === 'reconciliation' && <ReconciliationTab accounts={accounts} />}
      {activeTab === 'statement-import' && <StatementImportTab />}
      {activeTab === 'fixed-deposits' && <FixedDepositsTab accounts={accounts} ledgerAccounts={ledgerAccounts} />}
      {activeTab === 'cheques' && <ChequesTab accounts={accounts} ledgerAccounts={ledgerAccounts} />}
    </div>
  );
}
