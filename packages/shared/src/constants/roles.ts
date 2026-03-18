/** Role slugs matching the database role records. */
export const ROLE_SLUGS = {
  SUPER_ADMIN: 'super_admin',
  ACCOUNTANT: 'accountant',
  MODERATOR: 'moderator',
  AUDITOR: 'auditor',
  COMMITTEE_MEMBER: 'committee_member',
  OWNER: 'owner',
  TENANT_RESIDENT: 'tenant_resident',
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

/** Module names used in the permission system. */
export const MODULES = {
  AUTH: 'auth',
  TENANT: 'tenant',
  UNIT: 'unit',
  LEDGER: 'ledger',
  INVOICE: 'invoice',
  RECEIPT: 'receipt',
  VENDOR: 'vendor',
  PURCHASE: 'purchase',
  BANK: 'bank',
  TAX: 'tax',
  REPORT: 'report',
  DOCUMENT: 'document',
  PAYMENT: 'payment',
  SUPER_ADMIN: 'super_admin',
} as const;

export type ModuleName = (typeof MODULES)[keyof typeof MODULES];

/** Actions that can be performed within a module. */
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  EXPORT: 'export',
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];
