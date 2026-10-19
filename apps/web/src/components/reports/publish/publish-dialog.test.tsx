import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogueRow } from '../catalogue-fixture';
import { PublishPanel } from './publish-dialog';

const state = vi.hoisted(() => ({ mutate: vi.fn(), data: undefined as unknown }));

vi.mock('@/hooks/use-reports', () => ({
  usePublishReports: () => ({ mutate: state.mutate, isPending: false, data: state.data, error: null }),
}));
vi.mock('@/hooks/use-unit-blocks', () => ({ useUnitBlocks: () => ({ data: undefined }) }));

const SHEET = catalogueRow({ key: 'gl.balance_sheet', name: 'Balance Sheet', params: [{ key: 'as_of', label: 'As of', type: 'as_of_date', required: true, default: 'as_of_today' }] });
const TRIAL = catalogueRow({ key: 'gl.trial_balance', name: 'Trial Balance' });

beforeEach(() => {
  state.mutate.mockReset();
  state.data = undefined;
});

describe('Publish selected reports (REP-09)', () => {
  it('posts one item per report with the audience and expiry chosen', () => {
    render(<PublishPanel rows={[SHEET, TRIAL]} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Title for Trial Balance'), { target: { value: 'Trial Balance for owners' } });
    fireEvent.change(screen.getByLabelText('Expiry date'), { target: { value: '2099-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(state.mutate).toHaveBeenCalledWith({
      items: [
        { key: 'gl.balance_sheet', params: { as_of: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) } },
        { key: 'gl.trial_balance', params: {}, title: 'Trial Balance for owners' },
      ],
      audience: 'all',
      expires_on: '2099-12-31',
    });
  });

  it('shows each line’s result: Posted, Sent for approval or Failed with the reason', () => {
    state.data = {
      data: [
        { key: 'gl.balance_sheet', status: 'published' },
        { key: 'gl.trial_balance', status: 'awaiting_approval' },
        { key: 'unit.signature_all_users', status: 'failed', error_code: 'report_not_publishable' },
      ],
    };
    const people = catalogueRow({ key: 'unit.signature_all_users', name: 'Signature List - All Users' });
    render(<PublishPanel rows={[SHEET, TRIAL, people]} onClose={vi.fn()} />);

    expect(screen.getByText('Posted')).toBeTruthy();
    expect(screen.getByText('Sent for approval')).toBeTruthy();
    expect(screen.getByText('Failed: it carries personal data and is never posted')).toBeTruthy();
  });

  it('drops a report from the list', () => {
    render(<PublishPanel rows={[SHEET, TRIAL]} onClose={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(screen.queryByText('Balance Sheet')).toBeNull();
  });
});
