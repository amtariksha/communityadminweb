import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { cellFields, PermissionsGrid, RBAC_RESOURCES, RBAC_ROLES, type PermissionCell } from './permissions-grid';

/**
 * D11 — the grid gains a `dashboard` column and rows for the moderator and
 * both supervisors, so a community admin can switch any role's dashboard off.
 * The dashboard is only ever read; the moderator has no other cell.
 */

const OFF: PermissionCell = { can_read: false, can_write: false, can_delete: false };

function renderGrid(cells: Record<string, PermissionCell> = {}) {
  const onChange = vi.fn();
  render(
    <PermissionsGrid getPermission={(role, resource) => cells[`${role}:${resource}`] ?? OFF} onChange={onChange} />,
  );
  return onChange;
}

describe('PermissionsGrid', () => {
  it('lists the dashboard first and the moderator and both supervisors as rows', () => {
    expect(RBAC_RESOURCES[0]).toBe('dashboard');
    expect(RBAC_ROLES).toEqual(expect.arrayContaining(['moderator', 'security_supervisor', 'facility_supervisor']));
  });

  it('offers only Read on the dashboard, for every role', () => {
    for (const role of RBAC_ROLES) {
      expect(cellFields(role, 'dashboard')).toEqual(['can_read']);
    }
    renderGrid();

    expect(screen.getByLabelText('moderator dashboard Read')).toBeTruthy();
    expect(screen.queryByLabelText('community_admin dashboard Write')).toBeNull();
    expect(screen.getByLabelText('community_admin gate Write')).toBeTruthy();
  });

  it('gives the moderator a dashboard cell and nothing else', () => {
    expect(cellFields('moderator', 'announcements')).toEqual([]);
    renderGrid();

    expect(screen.queryByLabelText('moderator announcements Read')).toBeNull();
    expect(screen.getAllByText('—').length).toBe(RBAC_RESOURCES.length - 1);
  });

  it('lets a supervisor be edited like any other role', () => {
    expect(cellFields('security_supervisor', 'gate')).toEqual(['can_read', 'can_write', 'can_delete']);
  });

  it("switches a supervisor's dashboard off", () => {
    const onChange = renderGrid({ 'security_supervisor:dashboard': { can_read: true, can_write: false, can_delete: false } });
    const box = screen.getByLabelText('security_supervisor dashboard Read') as HTMLInputElement;

    expect(box.checked).toBe(true);
    fireEvent.click(box);

    expect(onChange).toHaveBeenCalledWith('security_supervisor', 'dashboard', 'can_read', false);
  });
});
