import type { CatalogueRow } from '@/hooks/use-reports';

/** Catalogue rows for the report component tests (made-up society data only). */
export function catalogueRow(overrides: Partial<CatalogueRow> & Pick<CatalogueRow, 'key' | 'name'>): CatalogueRow {
  return {
    module: 'general_ledger',
    section: 6,
    section_title: 'General Ledger',
    group: null,
    number: null,
    description: null,
    params: [],
    fixed_params: {},
    schedulable: true,
    publishable: true,
    available: true,
    active_schedules: [],
    ...overrides,
  };
}

export const SAMPLE_CATALOGUE: CatalogueRow[] = [
  catalogueRow({
    key: 'inc.member_incomes_due_list',
    name: 'Member Incomes Due List',
    module: 'maintenance_fee',
    section: 4,
    section_title: 'Income Tracker',
    group: 'A. Frequently Used',
    number: 6,
    description: 'Units with overdue dues',
  }),
  catalogueRow({
    key: 'inc.ageing_by_unit',
    name: 'Ageing Report - by Unit',
    module: 'maintenance_fee',
    section: 4,
    section_title: 'Income Tracker',
    group: 'B. Invoices',
    number: 11,
    available: false,
  }),
  catalogueRow({
    key: 'exp.ageing_report_by_vendor',
    name: 'Ageing Report By Vendor',
    module: 'expense_tracker',
    section: 5,
    section_title: 'Expense Tracker',
    number: 1,
  }),
  catalogueRow({ key: 'gl.balance_sheet', name: 'Balance Sheet', number: 1 }),
  catalogueRow({ key: 'gl.trial_balance', name: 'Trial Balance', number: null }),
];
