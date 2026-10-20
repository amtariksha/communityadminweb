import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { RequestChecklistPanel, checklistCount, incompleteChecklistMessage } from './request-checklist';

/** MOVE-13 — a request's ticks (n of m); disabled items are kept once ticked, never newly ticked. */

const mocks = vi.hoisted(() => ({ data: null as unknown, tick: vi.fn() }));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-move-checklists', () => ({
  useRequestChecklist: () => ({ data: mocks.data, isLoading: false, isError: false }),
  useTickChecklist: () => ({ mutate: mocks.tick, isPending: false }),
}));

afterEach(() => vi.clearAllMocks());

const item = (id: string, label: string, ticked: boolean, enabled = true) => ({
  item_id: id,
  label,
  is_enabled: enabled,
  ticked,
  ticked_at: ticked ? '2026-10-20T05:00:00.000Z' : null,
  ticked_by_name: ticked ? 'Test Secretary' : null,
});

describe('RequestChecklistPanel', () => {
  it('shows n of m and ticks an item', () => {
    mocks.data = { items: [item('i-1', 'Keys handed over', true), item('i-2', 'Police form received', false)], done: 1, total: 2 };
    render(<RequestChecklistPanel kind="onboarding" requestId="o-1" canTick />);
    expect(screen.getByRole('heading', { name: 'Checklist (1 of 2)' })).toBeTruthy();
    expect(screen.getByText(/Test Secretary/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Police form received'));
    expect(mocks.tick.mock.calls[0][0]).toEqual({ item_id: 'i-2', ticked: true });
  });

  it('keeps a disabled item’s old tick, may untick it but not tick it anew', () => {
    mocks.data = { items: [item('i-1', 'Old item', true, false), item('i-3', 'Gone item', false, false)], done: 1, total: 2 };
    render(<RequestChecklistPanel kind="exit" requestId="e-1" canTick />);
    expect((screen.getByLabelText('Old item') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText('Gone item') as HTMLInputElement).disabled).toBe(true);
  });

  it('is read-only without the right; shows nothing on an older API', () => {
    mocks.data = { items: [item('i-1', 'Keys handed over', false)], done: 0, total: 1 };
    const { unmount } = render(<RequestChecklistPanel kind="onboarding" requestId="o-1" canTick={false} />);
    expect((screen.getByLabelText('Keys handed over') as HTMLInputElement).disabled).toBe(true);
    unmount();
    mocks.data = null;
    const { container } = render(<RequestChecklistPanel kind="onboarding" requestId="o-1" canTick />);
    expect(container.textContent).toBe('');
  });

  it('reads the confirmation warning and the list count', () => {
    expect(incompleteChecklistMessage(new ApiError(409, { statusCode: 409, error: 'Conflict', request_id: 'r', timestamp: '', message: '0 of 2 ticked', code: 'checklist_incomplete' }))).toBe('0 of 2 ticked');
    expect(incompleteChecklistMessage(new ApiError(409, { statusCode: 409, error: 'Conflict', request_id: 'r', timestamp: '', message: 'other', code: 'conflict' }))).toBeNull();
    expect(checklistCount({ checklist_done: 0, checklist_total: 3 })).toBe('0 of 3');
    expect(checklistCount({})).toBe('—');
  });
});
