import { standardMenu, type NavGroup, type NavItem } from './standard-menu';
import type { MenuNode } from './classic-menu';

export interface MenuAccess {
  // Features enabled for the society; undefined while loading (show all,
  // as the standard sidebar does).
  enabledFeatures?: readonly string[] | null;
  // Supervisor allowlist of standard labels; null = see everything.
  roleAllowlist: ReadonlySet<string> | null;
}

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
  return items
    .filter((item) => item.href !== '/' && href.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function isHrefAllowed(href: string, access: MenuAccess): boolean {
  const item = governingItem(href);
  if (!item) return false;
  const featureOn =
    !item.feature || !access.enabledFeatures || access.enabledFeatures.includes(item.feature);
  const roleOn = !access.roleAllowlist || access.roleAllowlist.has(item.label);
  return featureOn && roleOn;
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
  const href = node.href && isHrefAllowed(node.href, access) ? node.href : undefined;
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
}

function matchLength(pathname: string, href: string | undefined): number {
  if (!href) return -1;
  if (href === '/') return pathname === '/' ? 1 : -1;
  return pathname === href || pathname.startsWith(`${href}/`) ? href.length : -1;
}

function candidates(nodes: readonly MenuNode[]): MenuLocation[] {
  return nodes.flatMap((module) => [
    { module },
    ...(module.children ?? []).flatMap((child) => [
      { module, child },
      ...(child.tabs ?? []).map((tab) => ({ module, child, tab })),
    ]),
    ...(module.tabs ?? []).map((tab) => ({ module, tab })),
  ]);
}

function targetHref(location: MenuLocation): string | undefined {
  return (location.tab ?? location.child ?? location.module).href;
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
    const length = matchLength(pathname, targetHref(location));
    if (length > bestLength) {
      best = location;
      bestLength = length;
    }
  }
  return best;
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
