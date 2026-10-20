/**
 * Where each dashboard button goes. A target that is a create form carries
 * `?new=1`, which the target page turns into an open form (DASH-07).
 * A tile whose route no menu entry owns stays hidden (canOpenRoute).
 */
export const DASHBOARD_ROUTES = {
  notifications: '/notifications',
  // The composer opened on a channel (ANN-09 / DASH-10).
  composePush: '/notifications?compose=1&channel=push',
  composeSms: '/notifications?compose=1&channel=sms_general',
  announcements: '/announcements',
  newAnnouncement: '/announcements?new=1',
  settings: '/settings',
  // The classic HelpDesk list (HELP-12).
  tickets: '/helpdesk/open',
  // Create Request as a page (HELP-13, SB-07).
  newRequest: '/helpdesk/new',
  defaulters: '/invoices?filter=defaulters',
  // DASH-13 — the paid-intimation queue (INC-65), maintenance or utility.
  paidIntimations: '/income/members/intimations',
  utilityIntimations: '/income/members/intimations?scope=utility',
  purchases: '/purchases',
  invoices: '/invoices',
  bank: '/bank',
  reports: '/reports',
  trialBalance: '/reports?report=trial-balance',
  financialStatements: '/reports?report=balance-sheet',
  utilities: '/utilities',
  // Incident Investigator's visitor register (GATE-10).
  gate: '/gate/investigator/visitors',
  units: '/units',
  // DASH-11 — Units & Users › Access Control, and the people who never signed in.
  accessControl: '/units/access-control/committee',
  neverLoggedIn: '/units/directory?app_status=never_logged_in',
  bookFacilities: '/amenities?new=1',
  newMeeting: '/governance?new=1',
  vendors: '/vendors',
  documents: '/documents',
  adminReports: '/admin-reports',
} as const;
