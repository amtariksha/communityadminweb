import { describe, expect, it } from 'vitest';
import type { MenuNode } from './menu/classic-menu';
import { withoutBlockedAreas } from './module-areas';

/** PROJ-47 — a switched-off area of Projects & Meetings leaves the classic menu. */
const MENU: MenuNode[] = [
  {
    id: 'projects',
    label: 'Projects & Meetings',
    children: [
      { id: 'projects.setup', label: 'SetUp' },
      { id: 'projects.projects', label: 'Projects' },
      { id: 'projects.meetings', label: 'Meetings' },
      { id: 'projects.tasks', label: 'Tasks' },
      { id: 'projects.reports', label: 'Reports' },
    ],
  },
  { id: 'assets', label: 'Asset & Inventory', children: [{ id: 'assets.setup', label: 'Setup' }] },
];

const childIds = (menu: MenuNode[]): string[] => menu.flatMap((node) => (node.children ?? []).map((child) => child.id));

describe('withoutBlockedAreas', () => {
  it('drops the children of switched-off areas only', () => {
    const menu = withoutBlockedAreas(MENU, { issue_tracker: { setup: true, projects: false, meetings: true, tasks: true, reports: false } });
    expect(childIds(menu)).toEqual(['projects.setup', 'projects.meetings', 'projects.tasks', 'assets.setup']);
  });

  it('keeps everything on an API without areas', () => {
    expect(childIds(withoutBlockedAreas(MENU, null))).toHaveLength(6);
  });
});
