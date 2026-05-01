export * from './types';
export * from './schemas';
export * from './constants';
export * from './utils';
export * from './error-codes';
// NotifPlan §1 — shared notification-category contract. Mirrors the
// communityos/packages/shared/src/notifications.ts file so the admin
// web's template editor reads the same action set + default routes
// the resident phones use at FCM time. Renaming a category here
// without updating the backend copy will produce broken pushes.
export * from './notifications';
// QA Round 14 #14-1z — APP_ROLE_ACCESS allowlist + helpers.
// Mirrors communityos/packages/shared/src/roles.ts so the admin web,
// the resident Flutter app, and the guard Flutter app all gate their
// UI from the same source of truth as the backend's auth service.
export * from './roles';
