import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DataTableAction } from '@/components/data-table';
import type { UnitDuesRow } from '@/hooks/use-unit-ledger';
import { UtilityIncomeContent } from './utility-income-content';

const captured = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/form-page', () => ({ useFormMode: () => 'page' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => ({ canRead: true, canWrite: true }) }));
vi.mock('@/components/member-income/member-income-table', () => ({
  MemberIncomeTable: (props: Record<string, unknown>) => {
    captured.props = props;
    return null;
  },
}));

const row = { unit_id: 'u-1', unit_number: 'A-101' } as UnitDuesRow;

describe('Utility Income (UTIL-08)', () => {
  it('is the dues workbench on the utility ledger, metered units only', () => {
    render(<UtilityIncomeContent />);

    expect(captured.props).toMatchObject({ scope: 'utility', trackedOnly: true, title: 'Utility Dues', exportFilename: 'utility-dues' });
  });

  it('opens its row screens under Utility Income', () => {
    render(<UtilityIncomeContent />);

    const actions = captured.props?.rowActions as DataTableAction<UnitDuesRow>[];
    expect(actions.map((action) => action.header)).toEqual(['Account History', 'Post Invoice', 'Post Collection', 'Print']);
    expect(actions[0].href?.(row)).toBe('/utilities/income/u-1/statement');
  });
});
