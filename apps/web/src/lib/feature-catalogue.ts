/**
 * Canonical feature catalogue for the admin web.
 *
 * The sidebar (`components/layout/sidebar.tsx`) gates every navigation
 * item on a `feature: '<key>'`. This file mirrors that list so the
 * super-admin and community-admin toggle UIs cannot drift away from
 * the actual nav.
 *
 * Two groups:
 *   - MODULE_FEATURES — one entry per sidebar nav item. Toggling these
 *     hides / shows that page for the tenant.
 *   - ABSTRACT_FEATURES — legacy/beta capability flags that don't map
 *     to a single nav item (e.g. AI Accounting, Digital Voting). Kept
 *     for backward compatibility with tenants that already have these
 *     keys set in `tenants.settings_json`.
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
];

export const ABSTRACT_FEATURES: FeatureToggle[] = [
  {
    key: 'ev_module',
    label: 'EV Charging',
    description: 'Electric vehicle charging slot allocation (legacy flag).',
  },
  {
    key: 'digital_voting',
    label: 'Digital Voting',
    description: 'Online voting flag — overlaps the Voting module toggle.',
  },
  {
    key: 'ai_accounting',
    label: 'AI Accounting',
    description: 'AI-powered accounting suggestions (preview).',
  },
  {
    key: 'visitor_management',
    label: 'Visitor Management',
    description: 'Coarser legacy flag — overlaps the Gate module toggle.',
  },
  {
    key: 'maintenance_requests',
    label: 'Maintenance Requests',
    description: 'Coarser legacy flag — overlaps the Tickets module toggle.',
  },
  {
    key: 'parking_management',
    label: 'Parking Management',
    description: 'Coarser legacy flag — overlaps the Parking module toggle.',
  },
];

export const ALL_FEATURES: FeatureToggle[] = [...MODULE_FEATURES, ...ABSTRACT_FEATURES];

/**
 * Set of every recognised feature key — useful for validating
 * `tenants.settings_json` keys at API boundaries.
 */
export const FEATURE_KEYS: ReadonlySet<string> = new Set(
  ALL_FEATURES.map((f) => f.key),
);
