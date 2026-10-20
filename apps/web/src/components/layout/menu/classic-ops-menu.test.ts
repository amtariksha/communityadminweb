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
  it('shows SetUp (PROJ-22), Meetings with Open and Closed as sub-tabs, then Tasks', () => {
    expect(children('projects')).toEqual([
      ['SetUp', '/governance/setup'],
      ['Meetings', undefined],
      ['Tasks', '/governance/tasks'],
      ['Reports', '/governance/reports'],
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

describe('Society Profile (PROF-10, PROF-21, PROF-22, PROF-40)', () => {
  it('shows Home, Images, Location, User Agreement, Downloadable Files and Emergency Contacts, each with the module’s log', () => {
    expect(children('profile')).toEqual([
      ['Home', '/society-profile/home'],
      ['Images', '/society-profile/images'],
      ['Location', '/society-profile/location'],
      ['User Agreement', '/society-profile/agreement'],
      ['Downloadable Files', '/society-profile/files'],
      ['Emergency Contacts', '/society-profile/emergency'],
    ]);
    expect(find(menu, 'profile.files')?.logs ?? find(menu, 'profile.downloads')?.logs).toContain('directory');
    expect(find(menu, 'profile.agreement')?.logs).toContain('society-agreement');
    expect(locate('/society-profile/agreement/edit', menu)?.form).toBe(true);
    expect(locate('/society-profile/agreement/edit', menu)?.child?.id).toMatch(/^profile\.agreement/);
  });

  it('gates its files with Documents and the rest with the directory page', () => {
    expect(governingItem('/society-profile/files')?.href).toBe('/documents');
    expect(governingItem('/society-profile/location')?.href).toBe('/directory');
    const noDocuments = visibleMenu(classicMenu, { roleAllowlist: null, enabledFeatures: ['units'] });
    expect(find(noDocuments, 'profile')?.children?.map((child) => child.label)).toEqual(['Home', 'Images', 'Location', 'User Agreement', 'Emergency Contacts']);
    expect(locate('/directory', menu)?.child?.id).toBe('profile.emergency');
  });
});

describe('Asset & Inventory (ASSET-07)', () => {
  it('expands to Setup · Assets · Inventory with their sub-tabs', () => {
    expect(children('assets')?.map(([label]) => label)).toEqual(['Setup', 'Assets', 'Inventory', 'Reports']);
    expect(tabs('assets.assets')).toEqual([
      ['Active Assets', '/asset-inventory/assets/active'],
      ['Under Service Assets', '/asset-inventory/assets/under-service'],
      ['Expired Assets', '/asset-inventory/assets/expired'],
      ['Bulk Upload', '/asset-inventory/assets/bulk-upload'],
      ['View User Edits', '/asset-inventory/assets/edits'],
    ]);
    expect(tabs('assets.inventory')).toEqual([
      ['Active', '/asset-inventory/inventory/active'],
      ['Bulk Upload', '/asset-inventory/inventory/bulk-upload'],
      ['Expired', '/asset-inventory/inventory/expired'],
      ['Procurement', '/asset-inventory/inventory/procurement'],
      ['Movement Log', '/asset-inventory/inventory/movements'],
    ]);
  });

  it('offers Add Asset on the Assets pages and opens the asset form as a page', () => {
    expect(find(menu, 'assets.assets')?.create?.href).toBe('/asset-inventory/assets/new');
    expect(locate('/asset-inventory/assets/new', menu)?.child?.label).toBe('Add Asset');
    expect(locate('/asset-inventory/assets/7f9c', menu)?.child?.label).toBe('Edit Asset');
    expect(locate('/asset-inventory/assets/under-service', menu)?.tab?.id).toBe('assets.assets.under-service');
    expect(locate('/asset-inventory/inventory/7f9c', menu)?.child?.id).toBe('assets.inventory');
  });

  it('follows the assets feature, and keeps today’s pages reachable', () => {
    expect(governingItem('/asset-inventory/assets/active')?.href).toBe('/assets');
    expect(governingItem('/asset-inventory/inventory/active')?.href).toBe('/inventory');
    expect(find(visibleMenu(classicMenu, { roleAllowlist: null, enabledFeatures: ['units'] }), 'assets')).toBeUndefined();
    expect(locate('/inventory', menu)?.tab?.id).toBe('assets.inventory.procurement');
    expect(locate('/assets', menu)?.child?.id).toBe('more.asset-maintenance');
  });
});

describe('Vendor Master (VEND-06, VEND-07)', () => {
  it('shows both lists with Active and In-Active sub-tabs', () => {
    // VEND-09 adds Bulk Posting after the two lists.
    expect(children('vendors')?.map(([label]) => label)).toEqual(['Vendors For Expense', 'Vendors for Non Member Income', 'Bulk Posting']);
    expect(locate('/vendor-master/bulk-posting/expense', menu)?.child?.label).toBe('Vendors For Expense');
    expect(tabs('vendors.expense')).toEqual([
      ['Active', '/vendor-master/expense'],
      ['In-Active', '/vendor-master/expense/inactive'],
    ]);
    expect(tabs('vendors.non-member')).toEqual([
      ['Active', '/vendor-master/non-member-income'],
      ['In-Active', '/vendor-master/non-member-income/inactive'],
    ]);
  });

  it('opens the vendor form as a page and keeps today’s pages in the module', () => {
    expect(locate('/vendor-master/vendors/new', menu)?.child?.label).toBe('Add Vendor');
    expect(locate('/vendor-master/vendors/v-1/edit', menu)?.form).toBe(true);
    expect(locate('/vendor-master/expense/inactive', menu)?.tab?.id).toBe('vendors.expense.inactive');
    expect(locate('/customers', menu)?.child?.id).toBe('vendors.non-member');
    expect(governingItem('/vendor-master/non-member-income')?.href).toBe('/customers');
    expect(governingItem('/vendor-master/expense')?.href).toBe('/vendors');
  });
});
