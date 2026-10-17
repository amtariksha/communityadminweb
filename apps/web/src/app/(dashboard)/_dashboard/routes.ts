/**
 * Where each dashboard button goes. A target that is a create form carries
 * `?new=1`, which the target page turns into an open form (DASH-07).
 * `/admin-reports` has no screen yet (REP); the tile stays hidden until a
 * menu entry owns that route.
 */
export const DASHBOARD_ROUTES = {
  notifications: '/notifications',
  announcements: '/announcements',
  newAnnouncement: '/announcements?new=1',
  settings: '/settings',
  // The classic HelpDesk list (HELP-12).
  tickets: '/helpdesk/open',
  newRequest: '/tickets?new=1',
  defaulters: '/invoices?filter=defaulters',
  purchases: '/purchases',
  invoices: '/invoices',
  bank: '/bank',
  reports: '/reports',
  trialBalance: '/reports?report=trial-balance',
  financialStatements: '/reports?report=balance-sheet',
  utilities: '/utilities',
  gate: '/gate',
  units: '/units',
  bookFacilities: '/amenities?new=1',
  newMeeting: '/governance?new=1',
  vendors: '/vendors',
  documents: '/documents',
  adminReports: '/admin-reports',
} as const;
