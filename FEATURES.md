# CommunityOS Admin Panel -- Feature Guide

## Overview

The Admin Panel is a Next.js web application for housing society facility managers, treasurers, committee members, and super admins. It provides comprehensive tools for financial accounting, invoice management, vendor payments, gate security, staff management, utility billing, tax compliance, and multi-tenant administration.

- **Target users:** Society treasurers, facility managers, committee members, super admins
- **Tech stack:** Next.js 16 (App Router), React 19, TanStack React Query, Tailwind CSS v4, shadcn/ui components, Recharts, Zod validation
- **Deployment:** Vercel (`communityos.eassy.life`)
- **API base:** `community.eassy.life` (NestJS backend)

---

## Current Features (v2.0)

### Authentication and Access

#### OTP-based Login
- Phone number + OTP authentication (same flow as mobile apps)
- **Page:** `/login`
- **API endpoints:** `POST /auth/send-otp`, `POST /auth/verify-otp`

#### Tenant Selection
- Select which society to manage (multi-tenant support)
- **Page:** `/select-tenant`
- **API endpoint:** `POST /auth/switch-tenant`

#### Role-based Access Control
- Users without appropriate permissions see a "No Access" page
- RBAC with resource-level permissions (configurable per role)
- **Page:** `/no-access`

---

### Dashboard

#### Society Dashboard
- Overview stats: total units, occupancy, collection rate, outstanding dues
- Charts powered by Recharts (collection trends, category breakdown)
- Quick navigation to key areas
- **Page:** `/`
- **Hook:** `useDashboardData`

---

### Finance -- Accounts and Ledger

#### Chart of Accounts
- Full double-entry accounting chart of accounts
- Account groups with hierarchy (Assets, Liabilities, Income, Expenditure)
- Create, update, deactivate account groups and ledger accounts
- Set opening balances, bulk import balances
- **Page:** `/accounts`
- **Hooks:** `useAccountGroups`, `useLedgerAccounts`, `useCreateAccountGroup`, `useSetOpeningBalance`, `useBulkImportBalances`

#### Ledger Account Detail
- View individual account transactions and journal entries
- **Page:** `/accounts/[id]`
- **Hook:** `useLedgerAccount`

#### Financial Year Management
- Create financial years, set current year, freeze/unfreeze years
- **Hooks:** `useFinancialYears`, `useCreateFinancialYear`, `useSetCurrentYear`, `useFreezeYear`, `useUnfreezeYear`

#### Journal Entries
- View all journal entries with narration and amounts
- Create manual journal entries (always balanced: debit = credit)
- Reverse journal entries (creates contra entry, no deletions)
- **Hooks:** `useJournalEntries`, `useCreateJournalEntry`, `useReverseJournalEntry`

---

### Finance -- Invoices

#### Invoice Rules (Charge Types)
- Define recurring charge types: maintenance, sinking fund, parking, water, etc.
- Configure: name, ledger account, frequency, amount, GST applicability, GST rate
- Activate/deactivate rules
- **Hooks:** `useInvoiceRules`, `useCreateInvoiceRule`, `useUpdateInvoiceRule`

#### Invoice Generation and Posting
- Generate invoices for all units based on a rule and date
- Post invoices (creates journal entries in GL)
- Bulk update due dates
- Cancel invoices (reversal via credit note, no hard deletes)
- **Page:** `/invoices`
- **Hooks:** `useGenerateInvoices`, `usePostInvoices`, `useBulkUpdateDueDates`, `useCancelInvoice`

#### Late Payment Interest (LPI)
- Calculate LPI for overdue invoices
- Post LPI as separate invoices
- Waive interest on individual invoices
- **Hooks:** `useCalculateLPI`, `usePostLPI`, `useWaiveInterest`

#### Defaulters Report
- View units with overdue invoices: unit number, total overdue, months overdue, oldest due date
- **Hook:** `useDefaulters`

---

### Finance -- Receipts

#### Receipt Management
- View all receipts with filters
- Create receipts (manual cash/cheque/bank transfer recording)
- Bulk import receipts
- **Page:** `/receipts`
- **Hooks:** `useReceipts`, `useCreateReceipt`, `useBulkImportReceipts`

#### Credit Notes
- Issue credit notes for adjustments (no deletions in the system)
- **Hook:** `useCreateCreditNote`

#### Unallocated Credits and Advances
- View unallocated credits per unit
- Track advance payments
- Apply advances to outstanding invoices
- Recalculate arrears
- **Hooks:** `useUnallocatedCredits`, `useAdvances`, `useApplyAdvance`, `useRecalculateArrears`

#### Receipt Summary
- Aggregate summary of collections by period
- **Hook:** `useReceiptSummary`

---

### Finance -- Vendors

#### Vendor Management
- CRUD for vendors: name, PAN, GSTIN, bank details, payment terms
- Deactivate vendors (soft delete)
- **Page:** `/vendors`
- **Hooks:** `useVendors`, `useCreateVendor`, `useUpdateVendor`, `useDeactivateVendor`

---

### Finance -- Purchases

#### Purchase Requests (PR Workflow)
- Create purchase requests with line items
- Approve or reject PRs (multi-level approval support)
- Convert approved PR to vendor bill
- **Hooks:** `usePurchaseRequests`, `useCreatePR`, `useApprovePR`, `useRejectPR`, `useConvertPRToBill`

#### Vendor Bills
- Create vendor bills with TDS calculation
- Record bill payments
- **Page:** `/purchases`
- **Hooks:** `useVendorBills`, `useCreateBill`, `useRecordBillPayment`

#### Vendor Aging Report
- Outstanding amounts by vendor with aging buckets
- **Hook:** `useVendorAging`

---

### Finance -- Payments

#### Razorpay Payment Tracking
- View all online payments with status, amount, date
- Payment statistics summary
- Create payment orders for invoices
- Verify completed payments
- Initiate refunds
- **Page:** `/payments`
- **Hooks:** `usePayments`, `usePaymentStats`, `useCreatePaymentOrder`, `useVerifyPayment`, `useInitiateRefund`

#### Autopay Mandate Management
- View all autopay subscriptions across units
- View charges history per subscription
- Pause, resume, cancel subscriptions
- Create new subscriptions for units
- **Hooks:** `useAutopaySubscriptions`, `useAutopayCharges`, `usePauseSubscription`, `useResumeSubscription`, `useCancelAutopaySubscription`

---

### Finance -- Bank

#### Bank Accounts
- Create and manage multiple bank accounts (bank name, account number, IFSC, type, branch)
- Set primary account, opening balance
- **Page:** `/bank`
- **Hooks:** `useBankAccounts`, `useCreateBankAccount`, `useUpdateBankAccount`

#### Inter-account Transfers
- Record transfers between society bank accounts
- Creates matching journal entries automatically
- **Hook:** `useCreateTransfer`

#### Bank Reconciliation
- Match book entries with bank statement
- View unreconciled items with debit/credit details
- BRS (Bank Reconciliation Statement) summary:
  - Book balance vs statement balance
  - Deposits in transit, outstanding checks
  - Adjusted balances and difference
- **Hooks:** `useReconciliation`, `useBRSSummary`, `useReconcileTransaction`

#### Bank Statement Import
- Upload CSV bank statements
- Auto-matching against journal entries
- Manual matching for unmatched rows
- Exclude irrelevant rows
- **Hooks:** `useImportStatement`, `useStatementRows`, `useManualMatchRow`, `useExcludeRow`

#### Fixed Deposits
- Create FD records (bank, FD number, principal, rate, start/maturity dates)
- Mature FDs (book interest income)
- Renew FDs with updated terms
- **Hooks:** `useFixedDeposits`, `useCreateFD`, `useMatureFD`, `useRenewFD`

#### Cheque Management
- Issue cheques linked to vendor bills or ledger accounts
- Track cheque lifecycle: issued, cleared, bounced, cancelled
- Clear cheques with clearing date
- Handle bounced cheques (reversal entries)
- **Hooks:** `useCheques`, `useIssueCheque`, `useClearCheque`, `useBounceCheque`, `useCancelCheque`

---

### Finance -- Reports

#### Financial Reports
- **Trial Balance** -- all ledger accounts with debit/credit totals
- **Balance Sheet** -- assets vs liabilities snapshot
- **Income and Expenditure** statement
- **General Ledger Report** -- detailed transactions per account
- **Defaulters Report** -- overdue units with aging
- **Vendor Aging** -- outstanding vendor payments by age
- **Page:** `/reports`
- **Hooks:** `useTrialBalance`, `useBalanceSheet`, `useIncomeExpenditure`, `useGeneralLedgerReport`, `useDefaulters`, `useVendorAging`

---

### Management -- Units

#### Unit Management
- CRUD for units (flat number, block, floor, area, owner details)
- View unit statistics (total, occupied, vacant)
- View members per unit
- Add/remove unit members
- **Page:** `/units`
- **Hooks:** `useUnits`, `useCreateUnit`, `useUpdateUnit`, `useUnitStats`, `useBlocks`, `useUnitMembers`, `useAddMember`, `useRemoveMember`

#### Bulk Unit Import
- Import units from other platforms: ADDA, NoBroker, MyGate, ApnaComplex, or custom CSV
- CSV import with column mapping
- **Page:** `/units/import`
- **Hooks:** `useBulkImportUnits`, `useCsvImportUnits`

---

### Management -- Utilities

#### Meter Management
- Create utility meters (water, electricity, gas, DG) per unit
- Meter types, serial numbers, initial readings
- **Hooks:** `useMeters`, `useCreateMeter`, `useUpdateMeter`

#### Slab-based Rate Configuration
- Define consumption slabs with rates (e.g., 0-10 kL at Rs 5/kL, 10-20 kL at Rs 8/kL)
- Create, update, delete slab configurations
- **Hooks:** `useSlabs`, `useCreateSlab`, `useUpdateSlab`, `useDeleteSlab`

#### Meter Readings
- Submit individual readings
- Bulk upload readings via CSV
- **Hooks:** `useSubmitReading`, `useSubmitBulkReadings`

#### Utility Bill Calculation
- Calculate bills based on slab rates and consumption
- Convert utility bills to invoices (posts to GL)
- **Page:** `/utilities`
- **Hooks:** `useCalculateBills`, `useBillToInvoice`, `useUtilityBills`, `useUtilityStats`

---

### Management -- Gate

#### Visitor Dashboard
- Gate statistics: expected today, checked in, checked out
- View all visitors with filters
- **Hooks:** `useGateStats`, `useVisitors`

#### Visitor Operations
- Create visitor passes (pre-register)
- Log walk-in visitors
- OTP verification
- Check-in and check-out visitors
- Cancel visitor entries
- **Page:** `/gate`
- **Hooks:** `useCreateVisitor`, `useWalkInVisitor`, `useVerifyVisitorOtp`, `useCheckInVisitor`, `useCheckOutVisitor`, `useCancelVisitor`

#### Staff Gate Logs
- View staff check-in/out logs
- Manual check-in/out from admin panel
- **Hooks:** `useStaffLogs`, `useStaffCheckIn`, `useStaffCheckOut`

#### Parcel Management
- View all parcels with status filters
- Log new parcels
- Mark parcels as collected
- **Hooks:** `useParcels`, `useCreateParcel`, `useCollectParcel`

---

### Management -- Tickets

#### Ticket Management
- View all tickets/complaints with filters (status, category, priority, assignee)
- Ticket statistics: total, open, in_progress, resolved, SLA breaches
- **Hooks:** `useTickets`, `useTicketStats`, `useTicketCategories`

#### Ticket Operations
- Create tickets (category, subject, description, priority)
- Update tickets (reassign, change priority/status)
- Add comments for thread-based discussion
- Bulk close tickets
- Bulk reassign tickets
- **Page:** `/tickets`
- **Hooks:** `useCreateTicket`, `useUpdateTicket`, `useAddTicketComment`, `useBulkCloseTickets`, `useBulkReassignTickets`

#### SLA Tracking
- Auto-escalation based on SLA timelines
- Track response time and resolution time

---

### Management -- Announcements

#### Announcement Management
- Create announcements with title, body, category, target audience
- Publish/unpublish announcements
- Pin announcements to top
- Set expiry dates
- Delete announcements
- View active vs all announcements
- **Page:** `/announcements`
- **Hooks:** `useAnnouncements`, `useActiveAnnouncements`, `useCreateAnnouncement`, `useUpdateAnnouncement`, `usePublishAnnouncement`, `useDeleteAnnouncement`

---

### Management -- Staff

#### Employee Management
- Create employees: name, phone, role, department, salary
- Update employee details
- Deactivate employees (soft delete)
- **Hooks:** `useStaffEmployees`, `useCreateEmployee`, `useUpdateEmployee`, `useDeactivateEmployee`

#### Shift Management
- Define shifts: name, start time, end time, days
- Assign staff to shifts and gates
- **Hooks:** `useStaffShifts`, `useCreateShift`, `useUpdateShift`, `useDeleteShift`, `useStaffAssignments`, `useAssignStaff`

#### Attendance Tracking
- View attendance records with filters (date range, employee)
- Clock in/out from admin panel
- Attendance summary reports
- **Hooks:** `useStaffAttendance`, `useAttendanceSummary`, `useClockIn`, `useClockOut`

#### Leave Management
- View leave requests
- Approve or reject leave applications
- **Page:** `/staff`
- **Hooks:** `useStaffLeaves`, `useApplyLeave`, `useApproveLeave`, `useRejectLeave`

#### Multi-gate Configuration
- Create, update, delete society gates
- Assign guards and staff to specific gates
- **Hooks:** `useGates`, `useCreateGate`, `useUpdateGate`, `useDeleteGate`

#### RBAC (Role-based Access Control)
- View and update resource-level permissions
- Seed default permissions for new roles
- **Hooks:** `useRbacPermissions`, `useUpdatePermission`, `useSeedPermissions`

---

### Management -- Documents

#### Document Vault
- Organize documents by categories (bylaws, minutes, NOCs, insurance, etc.)
- Create custom categories
- Upload documents with metadata
- Update document details
- Track document expiry dates
- View expiring documents report
- **Page:** `/documents`
- **Hooks:** `useDocumentCategories`, `useCreateCategory`, `useDocuments`, `useUploadDocument`, `useUpdateDocument`, `useDeleteDocument`, `useExpiringDocuments`

---

### System -- Approvals

#### Approval Workflow
- View pending approval requests (inbox)
- Approve or reject requests with comments
- Cancel own requests
- Multi-level approval chains
- View approval detail with step history
- Filter by status, type
- **Page:** `/approvals`
- **Hooks:** `useMyPendingApprovals`, `useMyPendingCount`, `useApprovalRequests`, `useApprovalDetail`, `useApproveRequest`, `useRejectRequest`, `useCancelRequest`

---

### System -- Tax and Compliance

#### GST
- GST summary: taxable amount, CGST, SGST, IGST, ITC, net payable
- Detailed GST report: per-invoice breakdown with rates
- GSTR-1 export in government format (B2B, B2CS sections)
- **Hooks:** `useGstSummary`, `useGstReport`, `useGstr1Export`

#### TDS
- TDS summary by section: total amounts, deducted, deposited, pending
- TDS vendor-wise report
- Form 16A generation per vendor per financial year
- Challan recording (challan number, BSR code, payment date)
- **Hooks:** `useTdsSummary`, `useTdsVendors`, `useForm16A`, `useChallans`, `useCreateChallan`

#### Remittances
- Record tax/statutory remittances (PF, ESIC, PT, GST, TDS)
- Track payment dates and reference numbers
- **Hooks:** `useRemittances`, `useCreateRemittance`

#### Compliance Calendar
- Automated compliance calendar by financial year
- Status tracking: upcoming, due soon, overdue, completed
- Covers GST filings, TDS returns, PF/ESIC deposits
- **Hook:** `useComplianceCalendar`

---

### System -- Settings

#### Society Settings
- Society name, address, GSTIN, PAN, TAN
- Gate configuration
- Role and permission management
- **Page:** `/settings`

---

### Super Admin

#### Tenant Management
- View all societies/tenants on the platform
- Create new tenants with settings
- Update tenant details
- View tenant statistics and dashboard
- **Page:** `/super-admin`
- **Hooks:** `useTenants`, `useCreateTenant`, `useUpdateTenant`, `useTenantSettings`, `useTenantStats`, `useSuperAdminDashboard`

#### User Management
- View all users across tenants
- View user roles across societies
- Assign and remove roles
- **Hooks:** `useSuperAdminUsers`, `useSuperAdminUserRoles`, `useAssignUserRole`, `useRemoveUserRole`

#### Member Management
- View members per tenant
- Add members to tenants (with role assignment)
- Update member details
- Remove members
- **Hooks:** `useTenantMembers`, `useAddMemberToTenant`, `useUpdateTenantMember`, `useRemoveTenantMember`, `useAddMemberWithRoles`

---

### Public Pages

#### QR Visitor Pass Page
- Public page for visitors to view their pass details
- Shows QR code for guard scanning
- **Page:** `/pass/[code]`

---

## Parked Features (Future Releases)

### AI Face Recognition Gate Entry -- ~1 month
- Jetson edge device with InsightFace/ArcFace model
- Admin panel for enrollment management, match logs, accuracy reports
- DB tables ready. Hardware procurement pending.

### WhatsApp Bot -- Sprint 6-7
- Chatagent integration for automated notifications
- Invoice reminders, payment confirmations, visitor alerts
- WABA setup needed

### Self-Registration + Approval
- Resident self-registers, community admin approves
- Skipped per product decision

### Parking Management
- Slot CRUD, assignments, vehicle registration, sub-letting
- ParkSmart API integration
- DB table exists (`parking_slots`)

### BBPS Biller Registration
- UPI bill payments via BBPS aggregator
- Needs Setu/BillDesk integration

### Amenity Booking
- Clubhouse, gym, pool, party hall booking
- Calendar view, time slots, pricing, approval workflow

### Digital Voting
- AGM/EGM online voting
- Quorum tracking, proxy voting, secret ballot

### Aadhaar/DigiLocker KYC
- Identity verification for member onboarding

### Push Notifications
- Real-time browser notifications for approvals, payments, tickets

### ANPR Camera Integration
- Automatic Number Plate Recognition for vehicle gate entry

---

## Technical Reference

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 (App Router) |
| React | v19.2 |
| Data fetching | TanStack React Query ^5.62 |
| Forms | react-hook-form ^7.54 + @hookform/resolvers |
| Validation | Zod ^3.24 (shared schemas with backend) |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui-style (custom) |
| Charts | Recharts ^2.15 |
| Icons | Lucide React ^0.468 |
| Dark mode | next-themes ^0.4.4 |
| Dates | date-fns ^4.1 |
| Shared types | @communityos/shared (workspace package) |

### Build Commands

```bash
pnpm install                  # Install dependencies
pnpm dev                      # Start dev server (port 3000)
pnpm build                    # Production build
pnpm lint                     # ESLint
pnpm type-check               # TypeScript type checking
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_RAZORPAY_KEY` | Razorpay key ID |

### Sidebar Navigation Structure

```
Overview
  Dashboard          /

Finance
  Accounts           /accounts
  Invoices           /invoices
  Receipts           /receipts
  Vendors            /vendors
  Purchases          /purchases
  Payments           /payments
  Bank               /bank
  Reports            /reports

Management
  Units              /units
  Gate               /gate
  Utilities          /utilities
  Tickets            /tickets
  Announcements      /announcements
  Staff              /staff
  Documents          /documents

System
  Approvals          /approvals
  Settings           /settings
```

### Page Route Map

| Path | Page | Description |
|------|------|-------------|
| `/login` | Login | OTP authentication |
| `/select-tenant` | Tenant select | Choose society |
| `/no-access` | No access | Unauthorized users |
| `/` | Dashboard | Overview stats and charts |
| `/accounts` | Accounts | Chart of accounts, ledger |
| `/accounts/[id]` | Account detail | Individual account transactions |
| `/invoices` | Invoices | Rules, generate, post, LPI, defaulters |
| `/receipts` | Receipts | Collection, credit notes, advances |
| `/vendors` | Vendors | Vendor CRUD |
| `/purchases` | Purchases | PR workflow, bills, TDS |
| `/payments` | Payments | Razorpay orders, refunds, autopay |
| `/bank` | Bank | Accounts, transfers, reconciliation, FDs, cheques |
| `/reports` | Reports | All financial reports |
| `/units` | Units | Unit CRUD, members |
| `/units/import` | Unit import | Bulk import from other platforms |
| `/utilities` | Utilities | Meters, slabs, readings, bills |
| `/gate` | Gate | Visitors, staff logs, parcels |
| `/tickets` | Tickets | Complaint management, SLA |
| `/announcements` | Announcements | Create, publish, manage |
| `/staff` | Staff | Employees, shifts, attendance, leaves, gates, RBAC |
| `/documents` | Documents | Categories, upload, expiry |
| `/approvals` | Approvals | Approval inbox and workflow |
| `/settings` | Settings | Society config, roles |
| `/super-admin` | Super Admin | Multi-tenant management |
| `/pass/[code]` | Visitor Pass | Public QR pass page |

### Hooks Summary (22 hook files)

| Hook File | Domain | Key Operations |
|-----------|--------|----------------|
| `use-auth` | Authentication | OTP flow, token refresh, tenant switch |
| `use-dashboard` | Dashboard | Aggregate stats |
| `use-ledger` | Accounting | COA, journal entries, financial reports |
| `use-invoices` | Billing | Rules, generate, post, LPI, defaulters |
| `use-receipts` | Collections | Receipts, credit notes, advances |
| `use-vendors` | Vendors | CRUD, deactivate |
| `use-purchases` | Procurement | PRs, bills, TDS, vendor aging |
| `use-payments` | Payments | Razorpay orders, refunds |
| `use-autopay` | Autopay | Mandates, charges, lifecycle |
| `use-bank` | Banking | Accounts, transfers, reconciliation, FDs, cheques, statements |
| `use-tax` | Tax | GST, TDS, Form 16A, challans, remittances, compliance |
| `use-units` | Units | CRUD, import, members, blocks |
| `use-utilities` | Utilities | Meters, slabs, readings, bills |
| `use-gate` | Gate | Visitors, staff logs, parcels |
| `use-tickets` | Tickets | CRUD, comments, bulk ops, SLA |
| `use-announcements` | Announcements | CRUD, publish, pin |
| `use-staff` | Staff | Employees, shifts, attendance, leaves, gates, RBAC |
| `use-documents` | Documents | Categories, upload, expiry |
| `use-approvals` | Approvals | Inbox, approve/reject, multi-level |
| `use-tenants` | Super Admin | Tenant CRUD, stats |
| `use-super-admin-users` | Super Admin | User roles management |
| `use-tenant-members` | Super Admin | Member CRUD per tenant |
