import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsGrid, type PermissionCell } from './permissions-grid';
import type { EnforcedResource } from '@/hooks/use-enforced-permissions';

// Each case renders a large screen (well under a second alone); under the full
// parallel run the default 5 s ran out, so this file allows 30 s a case.
vi.setConfig({ testTimeout: 30_000 });

/**
 * SB-15 — a Roles & Permissions cell no API route checks changes nothing, so
 * it is greyed out. The list comes from GET /rbac/permissions/enforced.
 */

const OFF: PermissionCell = { can_read: false, can_write: false, can_delete: false };
const ENFORCED: EnforcedResource[] = [
  { resource: 'units', actions: ['read', 'write'] },
  { resource: 'dashboard', actions: ['read'] },
];

function renderGrid(enforced?: EnforcedResource[]) {
  const onChange = vi.fn();
  render(<PermissionsGrid getPermission={() => OFF} onChange={onChange} enforced={enforced} />);
  return onChange;
}

const box = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

describe('PermissionsGrid with the checked cells known', () => {
  it('greys out the cells no route checks and keeps the rest usable', () => {
    const onChange = renderGrid(ENFORCED);

    expect(box('accountant units Write').disabled).toBe(false);
    expect(box('accountant units Delete').disabled).toBe(true);
    expect(box('accountant finance Read').disabled).toBe(true);
    expect(box('moderator dashboard Read').disabled).toBe(false);
    expect(box('accountant finance Read').closest('label')?.getAttribute('title')).toMatch(/changes nothing/);
    expect(screen.getByText(/Greyed out: no screen checks it yet/)).toBeTruthy();

    fireEvent.click(box('accountant units Write'));
    expect(onChange).toHaveBeenCalledWith('accountant', 'units', 'can_write', true);
  });

  it('offers every cell when the server does not say (older API)', () => {
    renderGrid(undefined);

    expect(box('accountant finance Delete').disabled).toBe(false);
    expect(screen.queryByText(/Greyed out/)).toBeNull();
  });
});
