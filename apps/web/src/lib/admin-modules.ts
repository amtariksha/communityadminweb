/**
 * UNIT-23 — the admin modules a person can be switched off for, mirroring
 * ADMIN_MODULES in @communityos/shared (communityos repo). `menuId` is the
 * classic menu module (UNIT-24 hides it); `routes` are the screens the
 * module owns in either layout (a direct URL to one says "no access").
 */
export interface AdminModule {
  id: string;
  label: string;
  menuId?: string;
  routes: readonly string[];
}

export const ADMIN_MODULES: readonly AdminModule[] = [
  { id: 'admin_residents', label: 'Units & Users', menuId: 'units', routes: ['/units', '/setup/categories', '/setup/kyc', '/notifications', '/voting'] },
  { id: 'complaint_tracker', label: 'HelpDesk Tracker', menuId: 'helpdesk', routes: ['/helpdesk', '/tickets'] },
  { id: 'maintenance_fee', label: 'Income Tracker', menuId: 'income', routes: ['/income', '/invoices', '/receipts', '/payments'] },
  { id: 'expense_tracker', label: 'Expense Tracker', menuId: 'expense', routes: ['/expense-tracker', '/purchases'] },
  { id: 'bank_cash', label: 'Bank & Cash', menuId: 'bank', routes: ['/bank', '/bank-cash'] },
  { id: 'general_ledger', label: 'General Ledger', menuId: 'ledger', routes: ['/accounts', '/ledger', '/general-ledger', '/tax'] },
  { id: 'utility_tracker', label: 'Utility Tracker', menuId: 'utility', routes: ['/utilities', '/gas'] },
  { id: 'attendance_manager', label: 'Gate & Visitors', menuId: 'gate', routes: ['/gate', '/patrol', '/sos', '/cctv'] },
  { id: 'staff_manager', label: 'Staff Manager', menuId: 'staff', routes: ['/staff'] },
  { id: 'moveinout_tracker', label: 'Move In/Out Tracker', menuId: 'move', routes: ['/move-in-out'] },
  { id: 'parking_manager', label: 'Parking Manager', menuId: 'parking', routes: ['/parking'] },
  { id: 'facility_booking', label: 'Amenity & Event', menuId: 'amenity', routes: ['/amenities', '/events'] },
  { id: 'community_restrictions', label: 'Community Rules & Violations', menuId: 'rules', routes: [] },
  { id: 'community_forms', label: 'Community Forms', menuId: 'forms', routes: [] },
  { id: 'issue_tracker', label: 'Projects & Meetings', menuId: 'projects', routes: ['/governance', '/meetings'] },
  { id: 'asset_tracker', label: 'Asset & Inventory', menuId: 'assets', routes: ['/assets', '/inventory', '/asset-inventory'] },
  { id: 'ad_manager', label: 'Announcement Mgr', menuId: 'announcements', routes: ['/announcements'] },
  { id: 'vendor_admin', label: 'Vendor Master', menuId: 'vendors', routes: ['/vendors', '/customers', '/vendor-master'] },
  { id: 'admin_file_list', label: 'Admin Files', menuId: 'files', routes: ['/documents', '/admin-files'] },
  { id: 'apartment_landing', label: 'Society Profile', menuId: 'profile', routes: ['/society-profile'] },
  { id: 'admin_reports', label: 'Admin Reports', menuId: 'reports', routes: ['/reports', '/admin-reports'] },
];

const under = (path: string, route: string): boolean => path === route || path.startsWith(`${route}/`);

/** The switchable module a route belongs to (the longest route wins), or undefined. */
export function moduleForRoute(path: string): AdminModule | undefined {
  let best: AdminModule | undefined;
  let length = -1;
  for (const module of ADMIN_MODULES) {
    for (const route of module.routes) {
      if (under(path, route) && route.length > length) {
        best = module;
        length = route.length;
      }
    }
  }
  return best;
}
