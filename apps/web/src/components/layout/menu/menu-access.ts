import { standardMenu, type NavGroup, type NavItem } from './standard-menu';
import type { MenuNode } from './classic-menu';
import { REPORT_ROUTE_FAMILIES } from '@/components/reports/module-reports';

export interface MenuAccess {
  // Features enabled for the society; undefined while loading (show all,
  // as the standard sidebar does).
  enabledFeatures?: readonly string[] | null;
  // Supervisor allowlist of standard labels; null = see everything.
  roleAllowlist: ReadonlySet<string> | null;
}

// Classic-only route families that a standard entry governs: the classic
// HelpDesk screens live under /helpdesk but follow the Tickets entry.
const ROUTE_FAMILIES: ReadonlyArray<readonly [prefix: string, governedBy: string]> = [
  // Admin Reports and each module's Reports page follow the Reports entry
  // (first: a module's own family would otherwise claim its Reports page).
  ...REPORT_ROUTE_FAMILIES,
  ['/helpdesk', '/tickets'],
  // Income Tracker › Setup is billing configuration: shown with Invoices.
  ['/income/setup', '/invoices'],
  // Panic Alerts reads the SOS list, so it is shown with SOS & Safety (GATE-11).
  ['/gate/investigator/panic-alerts', '/sos'],
  // Society Profile (PROF-10): its files are documents; the rest follows
  // today's directory page.
  ['/society-profile/files', '/documents'],
  ['/society-profile', '/directory'],
  // Expense Tracker screens follow the Purchases entry (EXP-08, EXP-09).
  ['/expense-tracker', '/purchases'],
  // Asset & Inventory (ASSET-07): the stock book follows Inventory, the
  // rest Assets (both the assets feature).
  ['/asset-inventory/inventory', '/inventory'],
  ['/asset-inventory', '/assets'],
];

/**
 * The standard menu entry that owns a route: the same path, or the
 * closest parent path. Its feature flag and label decide who may see the
 * route in the classic menu, so the two menus can never disagree.
 */
export function governingItem(
  href: string,
  groups: readonly NavGroup[] = standardMenu,
): NavItem | undefined {
  const items = groups.flatMap((group) => group.items);
  const exact = items.find((item) => item.href === href);
  if (exact) return exact;
  const family = ROUTE_FAMILIES.find(
    ([prefix]) => href === prefix || href.startsWith(`${prefix}/`),
  );
  if (family) return governingItem(family[1], groups);
  return items
    .filter((item) => item.href !== '/' && href.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/**
 * The standard entry that gates a classic entry: the one for today's
 * route when the entry has one (`aliases`), else the one for its own
 * route. A new classic route such as /income/registers/invoices is
 * gated exactly like /invoices.
 */
export function gatingItem(node: Pick<MenuNode, 'href' | 'aliases'>): NavItem | undefined {
  const route = node.aliases?.[0] ?? node.href;
  return route ? governingItem(route) : undefined;
}

function isAllowed(item: NavItem | undefined, access: MenuAccess): boolean {
  if (!item) return false;
  const featureOn =
    !item.feature || !access.enabledFeatures || access.enabledFeatures.includes(item.feature);
  const roleOn = !access.roleAllowlist || access.roleAllowlist.has(item.label);
  return featureOn && roleOn;
}

/**
 * Whether this user may open a route: the standard entry that owns it is
 * enabled for the society and visible to their role. A route no entry owns
 * (a screen that does not exist yet) is closed. A query string is ignored.
 */
export function canOpenRoute(href: string, access: MenuAccess): boolean {
  return isAllowed(governingItem(href.split('?')[0]), access);
}

function visibleNodes(nodes: readonly MenuNode[] | undefined, access: MenuAccess): MenuNode[] {
  return (nodes ?? []).flatMap((node) => {
    const visible = visibleNode(node, access);
    return visible ? [visible] : [];
  });
}

function visibleNode(node: MenuNode, access: MenuAccess): MenuNode | null {
  if (node.planned) return null;
  const children = visibleNodes(node.children, access);
  const tabs = visibleNodes(node.tabs, access);
  const href = node.href && isAllowed(gatingItem(node), access) ? node.href : undefined;
  if (!href && children.length === 0 && tabs.length === 0) return null;
  return {
    ...node,
    href,
    children: children.length > 0 ? children : undefined,
    tabs: tabs.length > 0 ? tabs : undefined,
  };
}

/** The menu as this user may see it: planned and forbidden entries removed. */
export function visibleMenu(nodes: readonly MenuNode[], access: MenuAccess): MenuNode[] {
  return visibleNodes(nodes, access);
}

/** Where clicking an entry goes: its own screen, else its first child or tab. */
export function entryHref(node: MenuNode): string | undefined {
  if (node.href) return node.href;
  const first = node.children?.[0] ?? node.tabs?.[0];
  return first ? entryHref(first) : undefined;
}

export interface MenuLocation {
  module: MenuNode;
  child?: MenuNode;
  tab?: MenuNode;
  // The module's create form, shown as a page of its own (SB-07).
  form?: true;
}

/**
 * The module's create form as a location, when it is a page of its own
 * (`/helpdesk/new`). A create that opens today's dialog (`?new=1`) is not.
 */
function createPage(module: MenuNode): MenuLocation[] {
  const create = module.create;
  if (!create || create.href.includes('?')) return [];
  return [{ module, child: { id: `${module.id}.create`, label: create.label, href: create.href }, form: true }];
}

/** Other form pages of the module and its children (`forms`). */
function formPages(module: MenuNode): MenuLocation[] {
  return [module, ...(module.children ?? [])].flatMap((node) =>
    (node.forms ?? []).map((form) => ({
      module,
      child: { id: `${node.id}.form:${form.path}`, label: form.label, href: form.path },
      form: true as const,
    })),
  );
}

function formPattern(path: string): RegExp {
  const source = path
    .split('/')
    .map((segment) => (segment.startsWith(':') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${source}/?$`);
}

function matchLength(pathname: string, href: string): number {
  if (href === '/') return pathname === '/' ? 1 : -1;
  if (href.includes('/:')) return formPattern(href).test(pathname) ? href.length : -1;
  return pathname === href || pathname.startsWith(`${href}/`) ? href.length : -1;
}

function candidates(nodes: readonly MenuNode[]): MenuLocation[] {
  return nodes.flatMap((module) => [
    { module },
    ...createPage(module),
    ...formPages(module),
    ...(module.children ?? []).flatMap((child) => [
      { module, child },
      ...(child.tabs ?? []).map((tab) => ({ module, child, tab })),
    ]),
    ...(module.tabs ?? []).map((tab) => ({ module, tab })),
  ]);
}

function targetHrefs(location: MenuLocation): string[] {
  const node = location.tab ?? location.child ?? location.module;
  return [...(node.href ? [node.href] : []), ...(node.aliases ?? [])];
}

/**
 * The module, child and tab a path belongs to: the entry with the
 * longest matching route, so /accounts/123 belongs to Chart of Accounts
 * but /accounts/reconcile-debtors to its own entry.
 */
export function locate(pathname: string, nodes: readonly MenuNode[]): MenuLocation | null {
  let best: MenuLocation | null = null;
  let bestLength = -1;
  for (const location of candidates(nodes)) {
    const length = Math.max(-1, ...targetHrefs(location).map((href) => matchLength(pathname, href)));
    if (length > bestLength) {
      best = location;
      bestLength = length;
    }
  }
  return best;
}

/** Today's routes that classic entries also claim (`aliases`). */
export function menuAliases(nodes: readonly MenuNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.aliases ?? []),
    ...menuAliases(node.children ?? []),
    ...menuAliases(node.tabs ?? []),
  ]);
}

/** Every route the menu points at, planned entries excluded. */
export function menuHrefs(nodes: readonly MenuNode[]): string[] {
  return nodes.flatMap((node) =>
    node.planned
      ? []
      : [
          ...(node.href ? [node.href] : []),
          ...menuHrefs(node.children ?? []),
          ...menuHrefs(node.tabs ?? []),
        ],
  );
}
