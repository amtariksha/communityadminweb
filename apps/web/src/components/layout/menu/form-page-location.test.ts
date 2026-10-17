import { describe, expect, it } from 'vitest';
import type { MenuNode } from './classic-menu';
import { locate } from './menu-access';

const MENU: MenuNode[] = [
  {
    id: 'helpdesk',
    label: 'HelpDesk Tracker',
    create: { label: 'Create Request', href: '/helpdesk/new' },
    children: [
      { id: 'helpdesk.escalation', label: 'Escalation', href: '/helpdesk/escalation' },
      { id: 'helpdesk.open', label: 'Open Requests', href: '/helpdesk/open' },
    ],
  },
  {
    id: 'announcements',
    label: 'Announcements',
    // A create that opens today's dialog is not a page of its own.
    create: { label: 'Create Announcement', href: '/announcements?new=1' },
    children: [{ id: 'announcements.active', label: 'Active', href: '/announcements' }],
  },
];

describe('locate — a module’s create form page (SB-07)', () => {
  it('puts the create page inside its module, as a form page', () => {
    const location = locate('/helpdesk/new', MENU);

    expect(location?.module.id).toBe('helpdesk');
    expect(location?.child?.label).toBe('Create Request');
    expect(location?.form).toBe(true);
  });

  it('leaves the other pages of the module as they were', () => {
    const location = locate('/helpdesk/open', MENU);

    expect(location?.child?.id).toBe('helpdesk.open');
    expect(location?.form).toBeUndefined();
  });

  it('does not take a create that opens a dialog for a page', () => {
    expect(locate('/announcements', MENU)?.form).toBeUndefined();
    expect(locate('/announcements', MENU)?.child?.id).toBe('announcements.active');
  });
});
