import type { MenuNode } from '@/components/layout/menu/classic-menu';

/**
 * Module Reports pages (REP-S6): each classic module whose report section
 * is in the registry gets a Reports child at `<module base>/reports`,
 * showing that module's section of Admin Reports. The menu takes its
 * entries from here, so a module is switched on in one place.
 */
export interface ModuleReportsPage {
  /** The classic menu module, e.g. `ledger`. */
  menuId: string;
  /** The registry module the catalogue is filtered by, e.g. `general_ledger`. */
  catalogueModule: string;
  href: string;
}

export const MODULE_REPORT_PAGES: readonly ModuleReportsPage[] = [
  { menuId: 'units', catalogueModule: 'admin_residents', href: '/units/reports' },
  { menuId: 'helpdesk', catalogueModule: 'complaint_tracker', href: '/helpdesk/reports' },
  { menuId: 'income', catalogueModule: 'maintenance_fee', href: '/income/reports' },
  { menuId: 'expense', catalogueModule: 'expense_tracker', href: '/expense-tracker/reports' },
  { menuId: 'bank', catalogueModule: 'bank_cash', href: '/bank/reports' },
  { menuId: 'ledger', catalogueModule: 'general_ledger', href: '/accounts/reports' },
  { menuId: 'projects', catalogueModule: 'issue_tracker', href: '/governance/reports' },
  { menuId: 'assets', catalogueModule: 'asset_tracker', href: '/asset-inventory/reports' },
  { menuId: 'gate', catalogueModule: 'attendance_manager', href: '/gate/reports' },
  { menuId: 'staff', catalogueModule: 'staff_manager', href: '/staff/reports' },
  { menuId: 'amenity', catalogueModule: 'facility_booking', href: '/amenities/reports' },
  { menuId: 'forms', catalogueModule: 'community_forms', href: '/community-forms/reports' },
];

/** Admin Reports itself; today's /reports is the same index (decision R1). */
export const ADMIN_REPORTS_HREF = '/admin-reports';

export function moduleReportsPage(menuId: string): ModuleReportsPage | undefined {
  return MODULE_REPORT_PAGES.find((page) => page.menuId === menuId);
}

export function moduleReportsByCatalogue(catalogueModule: string): ModuleReportsPage | undefined {
  return MODULE_REPORT_PAGES.find((page) => page.catalogueModule === catalogueModule);
}

/**
 * The module's Reports child: its page when the module has one, else a
 * planned entry naming the ticket that adds its reports.
 */
export function reportsMenuNode(menuId: string, plannedTicket: string): MenuNode {
  const page = moduleReportsPage(menuId);
  const id = `${menuId}.reports`;
  return page ? { id, label: 'Reports', href: page.href } : { id, label: 'Reports', planned: plannedTicket };
}

/** Route families for the menu gate: every Reports page follows the Reports entry. */
export const REPORT_ROUTE_FAMILIES: ReadonlyArray<readonly [prefix: string, governedBy: string]> = [
  [ADMIN_REPORTS_HREF, '/reports'],
  ...MODULE_REPORT_PAGES.map((page) => [page.href, '/reports'] as const),
];
