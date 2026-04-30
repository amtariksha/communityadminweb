/**
 * Notification category contract.
 *
 * Single source of truth for the {category → actions, default route,
 * audience} relationship. Backend uses it to set `data.category` on
 * the FCM payload; both Flutter apps mirror the same shape in Dart
 * and use it to register iOS / Android action sets at app start.
 *
 * If a category is renamed here, every consumer breaks at compile
 * time — that is intentional and the whole point of putting the
 * contract in `@communityos/shared`.
 *
 * See also:
 *   - docs/plans/notifications-flutter.md (product plan)
 *   - communityos/docs/NOTIFICATIONS.md (backend reference)
 */

// ---------------------------------------------------------------------------
// Category union
// ---------------------------------------------------------------------------

/**
 * Every notification we can fire to a phone or render in the inbox.
 *
 * Resident categories sit alongside guard / admin-mobile categories so
 * the backend can resolve a single audience-aware producer per event.
 * The Flutter apps filter the catalog by `audience` at registration
 * time so iOS doesn't try to register a category whose foreground
 * route doesn't exist in that app.
 */
export type NotificationCategory =
  // resident
  | 'invoice'
  | 'payment_received'
  | 'visitor_request'
  | 'regular_visitor_in'
  | 'regular_visitor_out'
  | 'parcel'
  | 'ticket_update'
  | 'complaint_update'
  | 'announcement'
  | 'approval_needed'
  | 'unit_approval_pending'
  | 'poll_created'
  | 'membership_change'
  | 'booking_confirmed'
  | 'lease_expiry'
  | 'monthly_report'
  // guard
  | 'gate_visitor_pre'
  | 'gate_pre_arrival'
  | 'parcel_log'
  | 'parcel_arrived'
  | 'shift_assigned'
  | 'staff_announcement'
  // admin-mobile
  | 'committee_escalation';

// ---------------------------------------------------------------------------
// Action shape
// ---------------------------------------------------------------------------

/**
 * One button on the notification.
 *
 * `foreground` controls whether tapping the action launches the host
 * Flutter app (true) or runs a silent background API call (false).
 *
 * `authRequired` reflects that every action needs the user to already
 * be logged in — there is no anonymous action surface. The flag stays
 * on the contract so the apps can short-circuit to the login screen
 * if the secure-storage token is missing rather than silently failing
 * the POST.
 *
 * `requiresBiometric` is set on destructive actions (deny / reject /
 * decline). The Flutter side wraps the dispatch with `local_auth`
 * before firing the API call. Server-side this is advisory only —
 * the API can't enforce client-side biometric.
 *
 * `inputPrompt` (optional) — for actions that take free-text input
 * (ticket reply). When set, the app surfaces an iOS
 * UNTextInputNotificationAction or Android remoteInput. `maxLength`
 * caps the input client-side; backend enforces independently on the
 * receiving endpoint.
 */
export interface NotificationAction {
  id: string;
  label: string;
  destructive?: boolean;
  foreground: boolean;
  authRequired: boolean;
  requiresBiometric?: boolean;
  inputPrompt?: {
    placeholder: string;
    maxLength: number;
  };
}

// ---------------------------------------------------------------------------
// Audience tags
// ---------------------------------------------------------------------------

/**
 * Which Flutter app this category targets.
 *
 * Multi-app categories (e.g. `staff_announcement` → guard + admin)
 * carry an array. The shared package emits a single catalog; each
 * app filters by membership at registration.
 */
export type NotificationAudience = 'resident' | 'guard' | 'admin-mobile';

// ---------------------------------------------------------------------------
// Catalog entry
// ---------------------------------------------------------------------------

/**
 * Static descriptor for one category.
 *
 * `default_route` uses `:entity_id` placeholder so the Flutter routing
 * code can interpolate from `data.entity_id` at tap time. Routes are
 * relative to the app's root navigator.
 *
 * `urgency` defaults to `'normal'`; `'urgent'` bypasses muted-
 * categories + quiet-hours filtering on the backend send path.
 */
export interface NotificationCategoryDescriptor {
  id: NotificationCategory;
  audience: NotificationAudience[];
  actions: NotificationAction[];
  default_route: string;
  urgency: 'normal' | 'urgent';
}

// ---------------------------------------------------------------------------
// FCM data payload
// ---------------------------------------------------------------------------

/**
 * The shape of `data` on every FCM message we send.
 *
 * Keys are intentionally camelCase-free — FCM stringifies every value
 * before delivery anyway, and we want the wire format readable from
 * the Firebase console without surprises.
 *
 * Backwards-compat fields (`notification_type`, `entity_type`,
 * `entity_id`) are kept alongside the new `category` so older app
 * installs (pre-Phase-1) still tap-route correctly. New installs
 * prefer `category` because the routing table is derived from
 * NOTIFICATION_CATEGORIES, not from the sparse legacy
 * `notification_type` set.
 */
export interface NotificationDataPayload {
  // primary contract
  title: string;
  body: string;
  category: NotificationCategory;

  // entity identity — used for both deep-linking and silent action
  // POSTs. `entity_id` may be empty string if the event isn't
  // associated with a row (e.g. broadcast announcement → entity_id
  // is the announcement, but a tenant-wide system message has none).
  entity_type: string;
  entity_id: string;

  // iOS grouping — `tenant-{id}` so multiple events from the same
  // tenant collapse into one notification stack on the lock screen.
  thread_id: string;

  // backwards-compat — maps to the legacy resident routeForNotification
  // table. Set to the same value as `category` for new installs;
  // older types kept for already-deployed apps.
  notification_type: string;

  // optional metadata (one level deep, every value stringified at
  // FCM serialization time). Used for category-specific extras like
  // `attachment_urls` on monthly_report or `replyable_until` on
  // ticket_update.
  metadata?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/**
 * Tap-routing target for an "info-only" view action — every category
 * either has a single View action, or a View action alongside other
 * actions. The View action is foreground (launches app) and never
 * requires biometric.
 */
function viewAction(label = 'View'): NotificationAction {
  return { id: 'view', label, foreground: true, authRequired: true };
}

/**
 * Mark-read action for inbox-style categories. Silent (no app open),
 * no biometric. POSTs to `/notifications/:id/read`.
 */
const markReadAction: NotificationAction = {
  id: 'mark_read',
  label: 'Mark Read',
  foreground: false,
  authRequired: true,
};

/**
 * Per-category action sets + routes. Order matters — iOS renders
 * actions in declared order on the lock-screen long-press menu.
 *
 * Every category from the §"Action button catalog" (plan) plus the
 * 7 newly added categories from the 2026-04-30 product feedback are
 * represented here. The backend sets `data.category` to the matching
 * id at send time.
 */
export const NOTIFICATION_CATEGORIES: Readonly<
  Record<NotificationCategory, NotificationCategoryDescriptor>
> = Object.freeze({
  // ---------- resident ----------

  invoice: {
    id: 'invoice',
    audience: ['resident'],
    actions: [
      {
        id: 'pay_now',
        label: 'Pay Now',
        foreground: true,
        authRequired: true,
      },
      viewAction(),
    ],
    default_route: '/invoices/:entity_id',
    urgency: 'normal',
  },

  payment_received: {
    id: 'payment_received',
    audience: ['resident'],
    actions: [viewAction('View Receipt')],
    default_route: '/receipts/:entity_id',
    urgency: 'normal',
  },

  visitor_request: {
    id: 'visitor_request',
    audience: ['resident'],
    actions: [
      {
        id: 'approve',
        label: 'Approve',
        foreground: false,
        authRequired: true,
      },
      {
        id: 'deny',
        label: 'Deny',
        destructive: true,
        foreground: false,
        authRequired: true,
        requiresBiometric: true,
      },
    ],
    default_route: '/visitors/:entity_id',
    urgency: 'normal',
  },

  regular_visitor_in: {
    id: 'regular_visitor_in',
    audience: ['resident'],
    actions: [viewAction()],
    default_route: '/visitors',
    urgency: 'normal',
  },

  regular_visitor_out: {
    id: 'regular_visitor_out',
    audience: ['resident'],
    actions: [],
    default_route: '/visitors',
    urgency: 'normal',
  },

  parcel: {
    id: 'parcel',
    audience: ['resident'],
    actions: [
      {
        id: 'collect',
        label: "I'll collect",
        foreground: false,
        authRequired: true,
      },
      {
        id: 'forward',
        label: 'Forward',
        foreground: true,
        authRequired: true,
      },
    ],
    default_route: '/parcels/:entity_id',
    urgency: 'normal',
  },

  ticket_update: {
    id: 'ticket_update',
    audience: ['resident'],
    actions: [
      {
        id: 'reply',
        label: 'Reply',
        foreground: false,
        authRequired: true,
        inputPrompt: { placeholder: 'Type a reply…', maxLength: 500 },
      },
      viewAction(),
    ],
    default_route: '/tickets/:entity_id',
    urgency: 'normal',
  },

  complaint_update: {
    id: 'complaint_update',
    audience: ['resident'],
    actions: [
      {
        id: 'reply',
        label: 'Reply',
        foreground: false,
        authRequired: true,
        inputPrompt: { placeholder: 'Type a reply…', maxLength: 500 },
      },
      viewAction(),
    ],
    default_route: '/tickets/:entity_id',
    urgency: 'normal',
  },

  announcement: {
    id: 'announcement',
    audience: ['resident'],
    actions: [markReadAction, viewAction()],
    default_route: '/announcements/:entity_id',
    urgency: 'normal',
  },

  approval_needed: {
    id: 'approval_needed',
    audience: ['resident', 'admin-mobile'],
    actions: [
      {
        id: 'approve',
        label: 'Approve',
        foreground: false,
        authRequired: true,
      },
      {
        id: 'reject',
        label: 'Reject',
        destructive: true,
        foreground: false,
        authRequired: true,
        requiresBiometric: true,
      },
      viewAction(),
    ],
    default_route: '/approvals/:entity_id',
    urgency: 'normal',
  },

  unit_approval_pending: {
    id: 'unit_approval_pending',
    audience: ['resident'],
    actions: [
      viewAction(),
      {
        id: 'acknowledge',
        label: 'Acknowledge',
        foreground: false,
        authRequired: true,
      },
    ],
    default_route: '/approvals/:entity_id',
    urgency: 'normal',
  },

  poll_created: {
    id: 'poll_created',
    audience: ['resident'],
    actions: [viewAction()],
    default_route: '/polls/:entity_id',
    urgency: 'normal',
  },

  membership_change: {
    id: 'membership_change',
    audience: ['resident'],
    actions: [viewAction()],
    default_route: '/units/:entity_id',
    urgency: 'normal',
  },

  booking_confirmed: {
    id: 'booking_confirmed',
    audience: ['resident'],
    actions: [viewAction('View Booking')],
    default_route: '/bookings/:entity_id',
    urgency: 'normal',
  },

  lease_expiry: {
    id: 'lease_expiry',
    audience: ['resident'],
    actions: [
      {
        id: 'renew',
        label: 'Renew',
        foreground: true,
        authRequired: true,
      },
      viewAction(),
    ],
    default_route: '/lifecycle',
    urgency: 'normal',
  },

  monthly_report: {
    id: 'monthly_report',
    audience: ['resident'],
    actions: [
      {
        id: 'download',
        label: 'Download PDF',
        foreground: true,
        authRequired: true,
      },
      viewAction('View Report'),
    ],
    default_route: '/reports/:entity_id',
    urgency: 'normal',
  },

  // ---------- guard ----------

  gate_visitor_pre: {
    id: 'gate_visitor_pre',
    audience: ['guard'],
    actions: [
      {
        id: 'verify_otp',
        label: 'Verify OTP',
        foreground: true,
        authRequired: true,
      },
      {
        id: 'manual',
        label: 'Manual Entry',
        foreground: true,
        authRequired: true,
      },
    ],
    default_route: '/visitor-entry',
    urgency: 'normal',
  },

  gate_pre_arrival: {
    id: 'gate_pre_arrival',
    audience: ['guard'],
    actions: [
      {
        id: 'acknowledge',
        label: 'Acknowledge',
        foreground: false,
        authRequired: true,
      },
    ],
    default_route: '/visitor-entry',
    urgency: 'normal',
  },

  parcel_log: {
    id: 'parcel_log',
    audience: ['guard'],
    actions: [
      {
        id: 'log',
        label: 'Log Parcel',
        foreground: true,
        authRequired: true,
      },
    ],
    default_route: '/parcels',
    urgency: 'normal',
  },

  parcel_arrived: {
    id: 'parcel_arrived',
    audience: ['guard'],
    actions: [
      {
        id: 'mark_received',
        label: 'Mark Received',
        foreground: false,
        authRequired: true,
      },
    ],
    default_route: '/parcels/:entity_id',
    urgency: 'normal',
  },

  shift_assigned: {
    id: 'shift_assigned',
    audience: ['guard'],
    actions: [
      {
        id: 'accept',
        label: 'Accept',
        foreground: false,
        authRequired: true,
      },
      {
        id: 'decline',
        label: 'Decline',
        destructive: true,
        foreground: false,
        authRequired: true,
        requiresBiometric: true,
      },
    ],
    default_route: '/shifts',
    urgency: 'normal',
  },

  staff_announcement: {
    id: 'staff_announcement',
    audience: ['guard', 'admin-mobile'],
    actions: [markReadAction, viewAction()],
    default_route: '/announcements/:entity_id',
    urgency: 'normal',
  },

  // ---------- admin mobile ----------

  committee_escalation: {
    id: 'committee_escalation',
    audience: ['admin-mobile'],
    actions: [viewAction(), markReadAction],
    default_route: '/escalations/:entity_id',
    urgency: 'urgent',
  },
});

// ---------------------------------------------------------------------------
// Legacy notification_type → category mapping
// ---------------------------------------------------------------------------

/**
 * Maps the legacy `notifications.notification_type` strings (and FCM
 * `data.notification_type`) to the new category id.
 *
 * Used during the rolling migration (Phase 1) to backfill `category`
 * on inbox rows that pre-date this contract, and to seed
 * `data.category` on new sends without changing every callsite.
 *
 * Items keyed only on the right side (e.g. `complaint_update`,
 * `unit_approval_pending`) are new categories with no legacy mapping
 * — they get set explicitly at the call site.
 */
export const LEGACY_TYPE_TO_CATEGORY: Readonly<
  Record<string, NotificationCategory>
> = Object.freeze({
  invoice_generated: 'invoice',
  payment_received: 'payment_received',
  visitor_at_gate: 'visitor_request',
  ticket_update: 'ticket_update',
  announcement: 'announcement',
  approval_needed: 'approval_needed',
  poll_created: 'poll_created',
  booking_confirmed: 'booking_confirmed',
  lease_expiry: 'lease_expiry',
  renewal: 'lease_expiry',
  utility: 'announcement',
  parcel: 'parcel',
});

/**
 * Convert a legacy notification_type to a category, falling back to
 * `'announcement'` (the most generic non-actionable inbox category)
 * if the type predates this contract entirely.
 */
export function categoryFromLegacyType(
  notificationType: string,
): NotificationCategory {
  return LEGACY_TYPE_TO_CATEGORY[notificationType] ?? 'announcement';
}
