import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AreaMatrix } from '@/hooks/use-module-areas';
import { AreaAccessMatrix, changedRows } from './area-access-matrix';

/**
 * SetUp › Access Control (PROJ-47, screen PROJ-S2): one tick per person per
 * area; "—" where the role does not reach it; community admins locked on;
 * Save sends only the ticks that changed.
 */

const AREAS = ['setup', 'projects', 'meetings', 'tasks', 'reports'];
const cells = (available: boolean, off: string[] = []) =>
  Object.fromEntries(AREAS.map((area) => [area, { enabled: !off.includes(area), available: available || area !== 'reports' }]));

const MATRIX: AreaMatrix = {
  module: 'issue_tracker',
  areas: AREAS.map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) })),
  people: [
    { user_id: 'u-ca', name: 'Admin Test', roles: ['community_admin'], locked: true, areas: cells(true) },
    { user_id: 'u-cm', name: 'Asha Test', roles: ['committee_member'], locked: false, areas: cells(true, ['projects']) },
    { user_id: 'u-ac', name: 'Kiran Test', roles: ['accountant'], locked: false, areas: cells(false) },
  ],
};

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('@/hooks/use-module-areas', () => ({
  useAreaMatrix: () => ({ data: MATRIX }),
  useSaveAreaMatrix: () => ({ mutateAsync: mocks.save, isPending: false }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

describe('AreaAccessMatrix', () => {
  beforeEach(() => mocks.save.mockReset().mockResolvedValue(MATRIX));

  it('sends only what changed', () => {
    const ticks = { 'u-cm': { setup: true, projects: true, meetings: true, tasks: false, reports: true } };
    expect(changedRows(MATRIX, { ...Object.fromEntries(MATRIX.people.map((row) => [row.user_id, Object.fromEntries(AREAS.map((a) => [a, row.areas[a].enabled]))])), ...ticks })).toEqual([
      { user_id: 'u-cm', areas: { projects: true, tasks: false } },
    ]);
  });

  it('locks the community admin, shows — where the role does not reach, and saves an untick', async () => {
    render(<AreaAccessMatrix />);

    expect((screen.getByLabelText('Admin Test: projects') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByLabelText('Kiran Test: reports')).toBeNull();
    expect((screen.getByLabelText('Asha Test: projects') as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByLabelText('Asha Test: meetings'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith([{ user_id: 'u-cm', areas: { meetings: false } }]));
  });
});
