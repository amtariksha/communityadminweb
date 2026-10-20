import type { MenuNode } from './menu/classic-menu';

/**
 * PROJ-47 — the classic menu children of a module's areas. An area switched
 * off for the person leaves the menu (UI only: the API refuses its routes,
 * 403 module_area_denied).
 */
const AREA_MENU_IDS: Readonly<Record<string, { menuId: string; children: Readonly<Record<string, string>> }>> = {
  issue_tracker: {
    menuId: 'projects',
    children: {
      setup: 'projects.setup',
      projects: 'projects.projects',
      meetings: 'projects.meetings',
      tasks: 'projects.tasks',
      reports: 'projects.reports',
    },
  },
};

/** The menu with the switched-off areas' children left out. */
export function withoutBlockedAreas(menu: readonly MenuNode[], areas: Record<string, Record<string, boolean>> | null | undefined): MenuNode[] {
  if (!areas) return [...menu];
  const hidden = new Set(
    Object.entries(AREA_MENU_IDS).flatMap(([module, map]) =>
      Object.entries(map.children)
        .filter(([area]) => areas[module]?.[area] === false)
        .map(([, childId]) => childId),
    ),
  );
  if (hidden.size === 0) return [...menu];
  return menu.map((node) => (node.children ? { ...node, children: node.children.filter((child) => !hidden.has(child.id)) } : node));
}
