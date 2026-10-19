import type { AccountType } from '@communityos/shared';

/** One tab of General Ledger › Chart of Accounts (GL-S1 to GL-S4). */
export interface ChartTab {
  slug: 'assets' | 'liabilities' | 'income' | 'expense';
  // The type the tab's grid saves under (PUT /ledger/accounts/bulk).
  type: Exclude<AccountType, 'equity'>;
  // Group types listed on the tab: equity sits under Liabilities (G3).
  groupTypes: readonly AccountType[];
  heading: string;
}

export const CHART_TABS: Readonly<Record<ChartTab['slug'], ChartTab>> = {
  assets: { slug: 'assets', type: 'asset', groupTypes: ['asset'], heading: 'Set up Asset Accounts' },
  liabilities: {
    slug: 'liabilities',
    type: 'liability',
    groupTypes: ['liability', 'equity'],
    heading: 'Set up Liability Accounts',
  },
  income: { slug: 'income', type: 'income', groupTypes: ['income'], heading: 'Set up Income Accounts' },
  expense: { slug: 'expense', type: 'expense', groupTypes: ['expense'], heading: 'Set up Expense Heads' },
};
