/**
 * Canonical feature catalogue for the admin web.
 *
 * The sidebar (`components/layout/sidebar.tsx`) gates every navigation
 * item on a `feature: '<key>'`. This file mirrors that list so the
 * super-admin and community-admin toggle UIs cannot drift away from
 * the actual nav.
 *
 * MODULE_FEATURES — one entry per sidebar nav item. The platform
 * administrator switches them per society (`tenants.enabled_features`);
 * the menus hide what is off.
 *
 * Every UI surface that renders feature toggles imports from here.
 * Don't fork this list.
 */

export interface FeatureToggle {
  key: string;
  label: string;
  description: string;
}

export const MODULE_FEATURES: FeatureToggle[] = [
  // Finance
  { key: 'accounts', label: 'Accounts', description: 'Chart of accounts + ledger account management.' },
  { key: 'invoices', label: 'Invoices', description: 'Maintenance invoice generation and posting.' },
  { key: 'receipts', label: 'Receipts', description: 'Receipt entry, allocations, and credit notes.' },
  { key: 'payments', label: 'Payments', description: 'Razorpay collection + autopay mandates.' },
  { key: 'vendors', label: 'Vendors', description: 'Vendor master data.' },
  { key: 'purchases', label: 'Purchases', description: 'Purchase requests, bills, and payments.' },
  { key: 'bank', label: 'Bank', description: 'Bank accounts, transfers, reconciliation, cheques.' },
  { key: 'reports', label: 'Reports & Tax', description: 'Financial reports, GST exports, statutory compliance.' },

  // Operations
  { key: 'units', label: 'Units & Members', description: 'Unit directory + member management.' },
  { key: 'gate', label: 'Gate Management', description: 'Visitor logs, staff check-in, parcels, ANPR.' },
  { key: 'utilities', label: 'Utilities', description: 'Electricity / water meter readings and billing.' },
  { key: 'parking', label: 'Parking', description: 'Slot allocation, vehicle registration, sublets.' },
  { key: 'amenities', label: 'Amenities', description: 'Bookable common areas with charge rules.' },
  { key: 'tickets', label: 'Tickets', description: 'Maintenance complaint tracking and SLA.' },
  { key: 'announcements', label: 'Announcements', description: 'Society-wide notices to residents.' },
  { key: 'voting', label: 'Voting', description: 'Digital ballots for AGM / committee decisions.' },
  { key: 'gas', label: 'Gas Management', description: 'Piped-gas meter readings and billing.' },
  { key: 'marketplace', label: 'Marketplace', description: 'Resident-to-resident classifieds.' },
  { key: 'assets', label: 'Assets', description: 'Asset register with AMC contracts and service logs.' },
  { key: 'cctv', label: 'CCTV', description: 'Camera feeds and ANPR rules.' },
  { key: 'staff', label: 'Staff', description: 'Society staff roster, shifts, attendance, leaves.' },
  { key: 'documents', label: 'Documents', description: 'Document vault — bylaws, NOCs, ID proofs.' },
  // RULE-01 — Community Rules & Violations.
  { key: 'violations', label: 'Rules & Violations', description: 'Rule categories, violations raised against units, warnings and penalties.' },
];

/**
 * Every recognised feature key: the modules of `tenants.enabled_features`.
 * The legacy capability flags (ev_module, digital_voting, ai_accounting,
 * visitor_management, maintenance_requests, parking_management) are gone:
 * nothing read them, so their switches changed nothing (SB-15).
 */
export const FEATURE_KEYS: ReadonlySet<string> = new Set(MODULE_FEATURES.map((f) => f.key));
