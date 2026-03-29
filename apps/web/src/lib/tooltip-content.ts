export const TOOLTIP = {
  // Super Admin
  superAdmin: {
    totalTenants: 'Total housing societies registered on the platform',
    totalUsers: 'Total active user accounts across all societies',
    totalRevenue: 'Estimated monthly revenue based on units and pricing',
    activeSocieties: 'Societies with active subscriptions',
    createTenant: 'Register a new housing society on the platform',
    adminPhone:
      'Phone number of the society admin. A user account will be auto-created and assigned the Committee Member role.',
    slug: 'URL-friendly identifier. Only lowercase letters, numbers, and hyphens.',
    pricePerUnit: 'Monthly subscription charge per unit in this society',
    userSearch: 'Search users by phone number, name, or email address',
  },

  // Dashboard
  dashboard: {
    income: 'Total income received in the selected period',
    expenses: 'Total expenses recorded in the selected period',
    outstanding: 'Total unpaid invoices across all units',
    collectionRate: 'Percentage of invoiced amount that has been collected',
  },

  // Invoices
  invoices: {
    rules: 'Recurring rules that auto-generate invoices each billing cycle',
    dueDate: 'Payment due date after which late payment interest may apply',
    lpi: 'Late Payment Interest calculated on overdue amounts',
    status: 'Draft: not yet posted. Posted: sent to members. Cancelled: reversed.',
  },

  // Receipts
  receipts: {
    mode: 'Payment method: Cash, Cheque, Bank Transfer, UPI, or Online',
    allocation: 'How the receipt amount is split across pending invoices',
    creditNote: 'Refund or adjustment issued against a previous receipt',
  },

  // Accounts / Ledger
  accounts: {
    group: 'Category grouping for ledger accounts (Income, Expense, Asset, Liability)',
    openingBalance: 'Starting balance when migrating from a previous system',
    journalEntry: 'Double-entry record where debits must equal credits',
  },

  // Units
  units: {
    unitNumber: 'Unique identifier for the unit (e.g., A-101, B-202)',
    area: 'Built-up area in square feet, used for proportional billing',
    type: 'Classification: 1BHK, 2BHK, 3BHK, Shop, Office, etc.',
  },

  // Payments
  payments: {
    totalCollected: 'Total amount successfully collected via online payments',
    platformFees: 'Razorpay processing fees deducted from collected amount',
    successfulCount: 'Number of payments completed successfully',
    failedCount: 'Number of payment attempts that failed or were abandoned',
    status: 'Created: order placed. Paid: payment confirmed. Failed: payment unsuccessful. Refunded: amount returned.',
    refund: 'Initiate a full refund for this payment. The amount will be returned to the payer.',
  },

  // Bank
  bank: {
    reconciliation:
      'Compare your bank statement entries against GL records to verify that every transaction is accounted for',
    unreconciledItems:
      'Transactions recorded in your books that have not yet been matched to a bank statement entry',
  },

  // Settings
  settings: {
    features: 'Enable or disable optional modules for this society',
  },
} as const;
