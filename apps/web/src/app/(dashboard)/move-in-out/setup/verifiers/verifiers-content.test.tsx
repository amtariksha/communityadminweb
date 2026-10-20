import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VerifiersSetup } from './verifiers-content';
import { verifiersError } from './verifiers-state';

/** MOVE-S1 — the flow switch, the two-level grid and one Save. */

const mocks = vi.hoisted(() => ({
  data: null as unknown,
  mutate: vi.fn(),
  canEdit: true,
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../../../settings/settings-access', () => ({ canChangeSettings: () => mocks.canEdit }));
vi.mock('@/hooks/use-move-in-setup', () => ({
  useMoveInFlow: () => ({ data: mocks.data, isLoading: false, isError: false }),
  useSaveMoveInFlow: () => ({ mutate: mocks.mutate, isPending: false }),
}));

const flow = (flowEnabled: boolean, levels: [number, number]) => ({
  flow_enabled: flowEnabled,
  grid: {
    request_type: 'move_in',
    configured: levels.some((level) => level > 0),
    people: [
      { user_id: 'u-1', name: 'Test Secretary', designation: 'Secretary', roles: ['committee_member'], level: levels[0] },
      { user_id: 'u-2', name: 'Test Office', designation: null, roles: ['accountant'], level: levels[1] },
    ],
    levels: [],
  },
});

afterEach(() => vi.clearAllMocks());

describe('Setup › Verifiers', () => {
  it('lists people as Name (Designation) with No Access, Level 1 and Level 2', () => {
    mocks.data = flow(false, [0, 0]);
    render(<VerifiersSetup />);
    expect(screen.getByText('Test Secretary (Secretary)')).toBeTruthy();
    expect(screen.getByText('Test Office')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Level 2' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'Level 3' })).toBeNull();
  });

  it('will not save the flow on while a level has nobody', () => {
    mocks.data = flow(false, [1, 0]);
    render(<VerifiersSetup />);
    fireEvent.click(screen.getByLabelText('Enable move-in flow'));
    expect(screen.getByRole('alert').textContent).toContain('Level 2');
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('saves the switch with each person’s level', () => {
    mocks.data = flow(false, [1, 0]);
    render(<VerifiersSetup />);
    fireEvent.click(screen.getByLabelText('Enable move-in flow'));
    fireEvent.click(screen.getByLabelText('Test Office: Level 2'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mocks.mutate.mock.calls[0][0]).toEqual({
      flow_enabled: true,
      people: [
        { user_id: 'u-1', level: 1 },
        { user_id: 'u-2', level: 2 },
      ],
    });
  });

  it('is read-only for everyone but the community admin', () => {
    mocks.canEdit = false;
    mocks.data = flow(true, [1, 2]);
    render(<VerifiersSetup />);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect((screen.getByLabelText('Enable move-in flow') as HTMLInputElement).disabled).toBe(true);
    mocks.canEdit = true;
  });

  it('says when the server does not have it yet, and when nobody can be chosen', () => {
    mocks.data = null;
    const { unmount } = render(<VerifiersSetup />);
    expect(screen.getByText(/not available yet/)).toBeTruthy();
    unmount();
    mocks.data = { flow_enabled: false, grid: { request_type: 'move_in', configured: false, people: [], levels: [] } };
    render(<VerifiersSetup />);
    expect(screen.getByText(/No committee or office staff to choose from/)).toBeTruthy();
  });

  it('only checks the levels while the flow is on', () => {
    expect(verifiersError({ flowEnabled: false, levels: {} })).toBeNull();
    expect(verifiersError({ flowEnabled: true, levels: { a: 1, b: 2 } })).toBeNull();
    expect(verifiersError({ flowEnabled: true, levels: { a: 2 } })).toContain('Level 1');
  });
});
