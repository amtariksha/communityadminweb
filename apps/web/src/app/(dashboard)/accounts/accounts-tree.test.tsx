import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AccountGroup, LedgerAccount } from '@communityos/shared';
import { buildTree, TreeNodeView } from './accounts-tree';

// Standard chart of accounts: De-Activate from the tree row (GL-14).

const SOCIETY = '11111111-1111-4111-8111-111111111111';
const GROUP = { id: 'g-ie', code: 'IE', name: 'Indirect Expenses', type: 'expense', parent_id: null, level: 1, is_active: true, sort_order: 0, tenant_id: SOCIETY } as AccountGroup;
const account = (id: string, name: string, extra: Partial<LedgerAccount> = {}) =>
  ({ id, code: id, name, group_id: 'g-ie', opening_balance: 0, balance_type: 'debit', is_system: false, is_active: true, tenant_id: SOCIETY, is_bank_account: false, bank_details: null, created_at: '2026-04-01', ...extra }) as LedgerAccount;

describe('accounts tree De-Activate', () => {
  it('offers De-Activate on ordinary accounts only and hands the account over', () => {
    const onDeactivate = vi.fn();
    const [node] = buildTree([GROUP], [account('5101', 'Garden Upkeep'), account('repair_expense', 'Repairs', { is_system: true })]);
    render(<TreeNodeView node={node} depth={0} onDeactivateAccount={onDeactivate} />);

    expect(screen.queryByRole('button', { name: 'De-Activate Repairs' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'De-Activate Garden Upkeep' }));
    expect(onDeactivate).toHaveBeenCalledWith(expect.objectContaining({ id: '5101' }));
  });

  it('shows no De-Activate button to a reader', () => {
    const [node] = buildTree([GROUP], [account('5101', 'Garden Upkeep')]);
    render(<TreeNodeView node={node} depth={0} />);
    expect(screen.queryByRole('button', { name: /De-Activate/ })).toBeNull();
  });
});
