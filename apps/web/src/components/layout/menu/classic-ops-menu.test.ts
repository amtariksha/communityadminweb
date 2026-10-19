import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classicMenu, type MenuNode } from './classic-menu';
import { governingItem, locate, visibleMenu, type MenuAccess } from './menu-access';

/**
 * The classic modules of wave 4 (P4): Admin Files, Projects & Meetings,
 * Society Profile, Asset & Inventory and Vendor Master, and the form
 * pages modules declare besides their create page (SB-07).
 */

const DASHBOARD_ROUTES = join(process.cwd(), 'src', 'app', '(dashboard)');
const EVERYONE: MenuAccess = { roleAllowlist: null };
const menu = visibleMenu(classicMenu, EVERYONE);

function find(nodes: readonly MenuNode[], id: string): MenuNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = find([...(node.children ?? []), ...(node.tabs ?? [])], id);
    if (nested) return nested;
  }
  return undefined;
}

const children = (id: string) => find(menu, id)?.children?.map((child) => [child.label, child.href]);
const tabs = (id: string) => find(menu, id)?.tabs?.map((tab) => [tab.label, tab.href]);

/** `/documents/:id/edit` → `documents/[id]/edit/page.tsx`. */
function formRouteExists(path: string): boolean {
  const folders = path.split('/').map((segment) => (segment.startsWith(':') ? `[${segment.slice(1)}]` : segment));
  return existsSync(join(DASHBOARD_ROUTES, ...folders, 'page.tsx'));
}

describe('form pages of a module (SB-07)', () => {
  const forms = classicMenu.flatMap((module) =>
    [module, ...(module.children ?? [])].flatMap((node) => (node.forms ?? []).map((form) => form.path)),
  );

  it.each(forms)('%s is a real page', (path) => {
    expect(formRouteExists(path)).toBe(true);
  });

  it('puts a form page in its module without Create or Close, an id standing for any record', () => {
    const edit = locate('/documents/7f9c/edit', menu);
    expect(edit?.module.id).toBe('files');
    expect(edit?.child?.label).toBe('Edit File');
    expect(edit?.form).toBe(true);

    const upload = locate('/documents/upload', menu);
    expect(upload?.child?.label).toBe('Upload File');
    expect(upload?.form).toBe(true);
  });
});

describe('Admin Files (FILE-10)', () => {
  it('shows Common Files with its two roots, the unit roster and Platform Files', () => {
    expect(children('files')).toEqual([
      ['Common Files', undefined],
      ['Unit Specific Files', '/documents/units'],
      ['Platform Files', '/documents/platform'],
    ]);
    expect(tabs('files.common')).toEqual([
      ['Admin Documents', '/documents/common/admin'],
      ['Resident Documents', '/documents/common/residents'],
    ]);
  });

  it('keeps today’s Documents page and a unit’s files inside the module', () => {
    expect(locate('/documents', menu)?.tab?.id).toBe('files.common.admin');
    expect(locate('/documents/units/u-1', menu)?.child?.id).toBe('files.unit');
    expect(governingItem('/documents/units')?.href).toBe('/documents');
  });
});

describe('Projects & Meetings (PROJ-10 to PROJ-12)', () => {
  it('shows Meetings with Open and Closed as sub-tabs, then Tasks', () => {
    expect(children('projects')).toEqual([
      ['Meetings', undefined],
      ['Tasks', '/governance/tasks'],
    ]);
    expect(tabs('projects.meetings')).toEqual([
      ['Open', '/governance/meetings/open'],
      ['Closed', '/governance/meetings/closed'],
    ]);
  });

  it('offers Create Meeting on every page and opens the meeting forms as pages', () => {
    expect(find(menu, 'projects')?.create).toEqual({ label: 'Create Meeting', href: '/governance/meetings/new' });
    expect(locate('/governance/meetings/new', menu)?.form).toBe(true);
    expect(locate('/governance/meetings/m-1/minutes', menu)?.child?.label).toBe('Meeting Minutes');
    expect(locate('/governance/meetings/m-1', menu)?.child?.id).toBe('projects.meetings');
    expect(locate('/governance', menu)?.child?.id).toBe('projects.meetings');
  });
});
