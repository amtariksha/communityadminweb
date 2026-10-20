import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovesContent, defaultMoveWindow } from './moves-content';

/** Move In/Out for the gate desk (GATE-45, GATE-S2): today to +7 days, type filter, no names. */

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/lib/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/date')>()),
  todayIST: () => '2026-10-20',
}));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));
vi.mock('@/hooks/use-unit-blocks', () => ({ useUnitBlocks: () => ({ data: undefined }) }));
const moves = vi.hoisted(() => ({ hook: vi.fn() }));
vi.mock('@/hooks/use-gate-desk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-gate-desk')>()),
  useGateMoves: (filters: unknown) => moves.hook(filters),
}));

describe('Move In/Out', () => {
  it('opens on today to +7 days and lists date, block, unit, type and status', () => {
    moves.hook.mockReturnValue({
      data: { data: [{ id: 'o1', date: '2026-10-21', block: 'B', unit_number: 'B-201', type: 'move_in', status: 'approved' }], total: 1 },
      isLoading: false,
    });
    const { container } = render(<MovesContent />);

    expect(moves.hook).toHaveBeenLastCalledWith(expect.objectContaining({ date_from: '2026-10-20', date_to: '2026-10-27' }));
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['S.No', 'Date', 'Block', 'Unit', 'Type', 'Status']);
    expect(screen.getByText('21/10/2026')).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Move-in' })).toBeTruthy();

    fireEvent.change(container.querySelector('select#move-type') as HTMLSelectElement, { target: { value: 'move_out' } });
    expect(moves.hook).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'move_out' }));
  });

  it('shows the empty line and the not-available state', () => {
    moves.hook.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false });
    const { unmount } = render(<MovesContent />);
    expect(screen.getByText('No moves scheduled in this period.')).toBeTruthy();
    unmount();
    moves.hook.mockReturnValue({ data: null, isLoading: false });
    render(<MovesContent />);
    expect(screen.getByText('Move In/Out for the gate is not available yet.')).toBeTruthy();
  });

  it('runs the window across a month end', () => {
    expect(defaultMoveWindow('2026-10-28')).toEqual({ from: '2026-10-28', to: '2026-11-04' });
  });
});
