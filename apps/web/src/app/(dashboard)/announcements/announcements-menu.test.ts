import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classicMenu, type MenuNode } from '@/components/layout/menu/classic-menu';
import { locate, visibleMenu } from '@/components/layout/menu/menu-access';

// The Announcements module of the classic menu (ANN-10).

const module = classicMenu.find((node) => node.id === 'announcements') as MenuNode;
const routeExists = (href: string): boolean =>
  existsSync(join(process.cwd(), 'src', 'app', '(dashboard)', href.split('?')[0], 'page.tsx'));

describe('classic menu — Announcements', () => {
  it('shows the four children in order, each a real route', () => {
    const visible = visibleMenu(classicMenu, { roleAllowlist: null }).find((node) => node.id === 'announcements');

    expect(visible?.children?.map((child) => child.label)).toEqual(['Setup', 'Awaiting Approval', 'Active', 'Retired']);
    for (const child of module.children ?? []) expect(routeExists(child.href ?? '')).toBe(true);
  });

  it('has Create Announcement on every page and Close to Active', () => {
    expect(module.create?.label).toBe('Create Announcement');
    expect(routeExists(module.create?.href ?? '')).toBe(true);
    expect(module.close).toBe('/announcements/active');
  });

  it('offers Show Logs on Setup, Awaiting Approval and Active, not on Retired', () => {
    const logs = Object.fromEntries((module.children ?? []).map((child) => [child.label, child.logs ?? []]));

    expect(logs).toEqual({
      Setup: ['announcement'],
      'Awaiting Approval': ['announcement'],
      Active: ['announcement'],
      Retired: [],
    });
  });

  it('keeps one announcement’s page and the create page inside the module', () => {
    expect(locate('/announcements/1b2c3d4e-0000-4000-8000-000000000001', classicMenu)?.module.id).toBe('announcements');
    expect(locate('/announcements/new', classicMenu)?.form).toBe(true);
    expect(locate('/announcements/active', classicMenu)?.child?.id).toBe('announcements.active');
  });
});
