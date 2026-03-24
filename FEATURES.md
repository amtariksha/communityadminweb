# CommunityOS — Admin Dashboard Features

> Next.js web application for society facility managers, treasurers, and committee members to manage all aspects of housing society operations.

**Framework**: Next.js 16 (App Router) | **UI**: shadcn/ui + Tailwind CSS v4
**State**: React Query (TanStack Query) | **Charts**: Recharts
**Auth**: Phone + OTP → JWT | **Deployment**: Vercel (communityos.eassy.life)

---

## Authentication & Multi-Tenancy

- Phone number login with OTP verification
- Multi-tenant society selector (after login)
- Role-based access control (RBAC):
  - **super_admin** — full platform access across all societies
  - **accountant** — financial operations + reports
  - **manager** — management operations (gate, staff, tickets)
  - **community_admin** — facility manager with full society access
  - **security_guard** — gate operations only (guard app)
  - **member** — resident access only (resident app)
- Resource-level permissions: Read / Write / Delete per role per module
- Session persistence with JWT refresh

---

## Navigation Structure

### Overview
- **Dashboard** — KPI summary, charts, quick actions

### Finance
- **Accounts** — Chart of Accounts, ledger accounts, financial years
- **Invoices** — Billing rules, invoice generation, posting, LPI
- **Receipts** — Payment recording, credit notes, advance tracking
- **Vendors** — Vendor master, contact info, bank details
- **Purchases** — Purchase requests, vendor bills, TDS
- **Payments** — Online payments (Razorpay), refunds, autopay mandates
- **Bank** — Bank accounts, transfers, BRS, FDs, statement import, cheques
- **Reports** — Trial Balance, Balance Sheet, I&E, General Ledger, aging

### Management
- **Units** — Flat/unit CRUD, member management, bulk import
- **Gate** — Multi-gate visitor/staff/parcel management
- **Utilities** — Meter readings, slab rates, bill calculation
- **Tickets** — Complaint management, SLA tracking, bulk actions
- **Announcements** — Society-wide notifications
- **Staff** — Employee management, shifts, attendance, leaves
- **Documents** — Document vault with categories and expiry tracking

### System
- **Settings** — Society configuration, roles & permissions
- **Super Admin** — Cross-tenant management (super_admin only)

---

## 1. Dashboard

- Welcome section with admin name and society name
- **KPI Cards**:
  - Total units / occupancy rate
  - Outstanding invoices (₹ amount)
  - Monthly collection rate (%)
  - Pending complaints count
- **Charts** (Recharts):
  - Monthly revenue trend (12 months)
  - Collection vs outstanding comparison
  - Top expense categories (pie chart)
- Quick action shortcuts to common tasks
- Recent activity feed

---

## 2. Accounts (Chart of Accounts)

### Account Groups
- Hierarchical tree: Assets → Liabilities → Income → Expenses
- Create sub-groups with parent-child relationships
- Sort order configuration
- Type-specific color coding

### Ledger Accounts
- Create account under group: name, code, type
- Set opening balance per financial year
- Bulk import opening balances (CSV upload)
- Account detail page:
  - Balance history across financial years
  - All journal entries posted to account
  - Running balance

### Financial Years
- Create financial year (April–March for Indian societies)
- Set current year
- Freeze/unfreeze year (prevents posting to frozen years)

### Journal Entries
- Manual JE creation: multi-line debit/credit entries
- Auto-balanced validation (∑debit = ∑credit)
- Reverse journal entry
- Source tracking (which invoice/receipt/payment created the JE)

---

## 3. Invoices & Billing

### Invoice Rules
- Create billing rules: name, charge type (flat/per-sqft), amount, frequency
- GST configuration: exempt, inclusive, exclusive with rate
- Ledger account linking (which revenue account to credit)
- LPI (Late Payment Interest) rate configuration
- Activate/deactivate rules

### Invoice Generation
- **Bulk generate** from rules: select rule → generates invoices for all active units
- Amount calculation: flat amount or rate × area_sqft + fixed addon
- GST auto-calculation with ₹7,500 exemption threshold
- Sequential invoice numbering (INV-0001, INV-0002, ...)
- Due date auto-set (configurable days after invoice date)

### Invoice Management
- **Status tabs**: All | Draft | Posted | Overdue | Paid
- Filter by date range, unit, member
- Paginated table with: number, unit, amount, balance_due, status, due_date
- **Post invoices**: Draft → Posted (creates GL journal entry: debit member_receivable, credit revenue)
- **Cancel invoice**: Creates credit note, posts reverse JE
- Bulk update due dates

### LPI (Late Payment Interest) — Phase 2
- **Post LPI**: Calculate interest on all overdue invoices (18% p.a. × days overdue)
- Creates journal entry: debit interest_receivable, credit interest_income
- Adds LPI as invoice line item
- **Waive Interest**: Credit note for LPI, reverse JE

### Defaulters Report
- Residents with outstanding balances
- Days overdue buckets (0-30, 30-60, 60-90, 90+)
- Contact information for follow-up

---

## 4. Receipts

### Create Receipt
- Select unit/resident → select pending invoice(s)
- Enter: amount, date, payment mode (cash/cheque/UPI/NEFT/Razorpay)
- Cheque reference number (if cheque mode)
- Narration
- Auto-creates GL entry: debit bank/cash, credit member_receivable

### Receipt List
- Receipt number, date, amount, mode, resident, status
- Pagination and date filters
- Reprint/void options

### Credit Notes
- For refunds or billing adjustments
- Auto-calculates credit against outstanding balance
- Posts reverse journal entry

### Summary Stats
- Total receipts this month/year
- Total collected (YTD)
- Average collection per unit
- Unallocated credits

### Advance Payment Tracking — Phase 2
- When payment exceeds invoice balance → surplus stored as advance
- List advances with remaining balance
- Apply advance against future invoices
- Auto-apply on invoice generation

---

## 5. Vendors

### Vendor Master
- **Registration**: Name, PAN, GSTIN, bank details (name, account, IFSC), phone, email, address
- Active/inactive status toggle
- Deactivate vendor (soft delete)
- Search and filter

### Vendor Detail
- Full information card
- Outstanding balance (from vendor aging)
- Payment history
- Bills/invoices linked
- TDS deductions summary

---

## 6. Purchases

### Purchase Requests (PR)
- Create PR: title, description, estimated amount, vendor, requester
- **Approval workflow**: Open → Approved / Rejected
- Maker-checker: requester ≠ approver
- Convert approved PR to vendor bill

### Vendor Bills
- Create bill: vendor, bill number, date, due date
- Line items: description, quantity, rate, amount
- GST amount (if applicable)
- TDS deduction (section, rate, amount)
- Total with tax calculations
- Post bill → creates GL entry: debit expense, credit vendor payable

### Bill Payment
- Record partial/full payment against vendor bill
- Payment mode: cash, cheque, bank transfer, UPI
- Reference numbers
- Auto-updates bill status

### Vendor Aging Report
- Outstanding bills by vendor
- Due date buckets: 0-30, 30-60, 60-90, 90+ days

---

## 7. Payments (Online)

### Payment Tracking
- List all Razorpay payments with filters: date, status, member
- Status types: created, paid, failed, refunded
- Payment detail: order ID, payment ID, amount, timestamp, method

### Refund Processing
- Initiate full refund via Razorpay
- Tracks refund status and amount
- Reverses invoice settlement

### UPI Autopay Mandates — Phase 2
- **Autopay Mandates tab** on payments page
- Summary cards: active mandates, paused, halted, coverage %
- Mandate table: unit, member, plan name, amount, status, charge count
- Filter by status
- Admin can cancel mandates
- Charge history: all auto-debit attempts with success/failure

---

## 8. Bank Management

### Bank Accounts
- CRUD for society bank accounts
- Fields: bank name, account number, IFSC, type (savings/current), branch
- Opening balance, current balance
- Primary account designation
- Active/inactive status

### Bank Transfers
- Inter-account transfers
- From/to account, amount, date, reference, narration
- Auto-creates balanced JE

### Bank Reconciliation Statement (BRS)
- Reconcile GL entries with bank records
- Mark items as reconciled
- Outstanding items report
- BRS summary with reconciliation percentage

### Fixed Deposits (FDs)
- Create FD: principal, interest rate, tenure, maturity date
- Calculate maturity amount
- Track FDs approaching maturity
- Renew FD on maturity
- Record interest accrual

### Bank Statement Import — Phase 2
- CSV upload: date, description, debit, credit, balance
- Auto-matching engine: matches by amount + date range (±3 days) against GL entries
- Manual matching for unmatched rows
- Match statuses: unmatched, auto_matched, manual_matched, excluded
- Import batch tracking

### Cheque Management — Phase 2
- Issue cheque: number, payee, amount, bank account, date
- Clear cheque: mark as cleared with clearing date
- Bounce cheque: mark bounced, auto-create reverse JE
- Cancel cheque
- Cheque register with status filters

---

## 9. Reports

### Trial Balance
- As-of date picker
- All ledger accounts with debit/credit totals
- Verification: ∑Debits = ∑Credits

### Balance Sheet
- Assets, Liabilities, Equity sections
- As-of date selection
- Net position summary

### Income & Expenditure Statement
- Period selection (date range)
- Revenue section (maintenance, interest, etc.)
- Expense section (staff, maintenance, utilities, etc.)
- Surplus/Deficit calculation

### General Ledger Report
- Select specific ledger account
- Date range filter
- All transactions posted to account
- Running balance per entry

### Defaulters Report
- Residents with outstanding balances
- Overdue days bucketing
- Contact information
- Send reminder action

### Vendor Aging Report
- Outstanding vendor bills
- Due date buckets
- Vendor-wise breakdown

---

## 10. Units & Members

### Unit Management
- Unit table: number, type (flat/shop/office/parking), wing/block, floor, area, rate, status
- Create/edit unit dialog
- Status types: occupied, vacant, reserved, sold
- Parking slot assignment

### Unit Members
- Add member: name, phone, email, relation (owner/tenant/family)
- View all members per unit
- Remove member

### Bulk Import
- CSV upload: unit_number, type, owner_name, owner_phone, area, rate, status
- Validation preview before import
- Rollback on errors
- Import confirmation with count

---

## 11. Gate Management

### Multi-Gate Configuration
- Create/edit gates: name, location, type, status
- Gate types: vehicle & pedestrian, vehicle only, pedestrian only, service
- Activate/deactivate gates

### Visitors Tab
- **Status tabs**: All | Pending | Checked-in | Checked-out | Rejected | Expired
- Visitor card: name, unit, resident, purpose, vehicle, timestamps
- Actions: approve, reject, check-in, check-out, cancel
- Admin pre-registration of visitors
- Walk-in logging
- Visitor pass QR code generation

### Staff Tab
- Staff attendance for the day
- Check-in/check-out tracking by gate
- Shift info display
- Daily attendance summary

### Parcels Tab
- Pending parcels (received, awaiting collection)
- Collected parcels (history)
- Parcel details: unit, courier, tracking, timestamps
- Mark collected action

---

## 12. Utilities — Phase 2

### Meters Tab
- Register meters: unit, type (water/electricity/gas), meter number
- Activate/deactivate meters
- Type icons: 💧 Water | ⚡ Electricity | 🔥 Gas

### Slab Rates Tab
- Configure tiered pricing per meter type
- Fields: range (from–to units), rate per unit, effective dates, label
- Create/delete slabs

### Readings Tab
- Submit single reading: select meter, enter value, date
- **Bulk CSV upload**: meter_number, reading_value, reading_date
- Auto-calculates consumption (current − previous reading)
- Reading history per meter

### Bills Tab
- **Calculate Bills**: select meter type + billing period → generates bills for all meters
- Slab-based amount calculation with minimum charge support
- **Generate Invoice**: convert utility bill to society invoice (creates invoice + GL entry)
- Filter by type, status
- Status types: pending, invoiced, paid

### Stats Dashboard
- Active meters count
- Pending bills count
- Total billed amount
- Unbilled readings count

---

## 13. Tickets / Complaints

### Ticket List
- **Status tabs**: All | Open | In Progress | Resolved | Closed | Reopened
- Table: ticket#, subject, category, priority badge, status badge, created date
- Pagination

### Ticket Detail
- Full complaint info: category, subject, description, priority, status
- SLA due date with overdue indicator
- **Status actions**: Mark In Progress → Resolve → Close
- Comment thread (internal + external comments)
- Assigned staff display

### Create Ticket (admin-initiated)
- Category selection, subject, description, priority
- Auto-generates ticket number (TKT-XXXX)
- SLA auto-calculated: 4h urgent, 24h high, 48h medium, 72h low

### Bulk Actions — Phase 2
- **Bulk Close**: Select multiple tickets → close with resolution note
- **Bulk Reassign**: Select multiple tickets → reassign to different staff member
- Internal audit comments added automatically

### Auto-Escalation — Phase 2
- Hourly scheduler checks SLA breaches
- Auto-bumps priority: low → medium → high → urgent
- Internal comment documents escalation
- Admin notified of escalated tickets

---

## 14. Announcements

### Announcement List
- **Tabs**: All | Published | Draft
- Card: title, category badge, priority, status, published date
- Categories: 🔴 Emergency | 🟠 Maintenance | 🟢 Event | 🔵 General

### Create/Edit Announcement
- Title, category dropdown, priority level
- Rich text body
- Expiry date (optional)
- Pin option (keep at top)

### Actions
- Publish (draft → published, sets published_at)
- Unpublish (reverts to draft)
- Delete (draft only)
- Edit (draft or published)

---

## 15. Staff / Employee Management

### Employees Tab
- Employee table: name, phone, type, unit assignment, status, join date
- Create employee: name, phone, type (security/housekeeping/maintenance/gardener/driver/other)
- Edit/deactivate employees
- ID proof recording

### Shifts Tab
- Create shift: name, start time, end time, days of week
- Assign staff to shifts and gates
- Edit/delete shifts

### Attendance Tab
- Date range filter
- Staff attendance records: present, absent, on-leave, half-day
- Check-in/check-out times
- Manual attendance marking

### Leaves Tab
- Leave requests: employee, type, dates, status, reason
- **Approve/reject** with optional note
- Leave types: casual, sick, earned, unpaid, emergency

---

## 16. Documents

### Document Vault
- **View modes**: Grid | List toggle
- **Category filter**: Notices | Minutes | Financial | Legal | Insurance | Other

### Upload Document
- File select (multi-format: PDF, DOC, XLS, IMG)
- Category assignment
- Title/description
- Expiry date (for insurance, licenses, contracts)
- Auto-notification on approaching expiry

### Document Card
- File type icon (PDF/Word/Excel/Image)
- File name, upload date, category badge, size
- Expiring soon warning (within 30 days)
- Actions: download, view, delete

---

## 17. Tax & Compliance — Phase 2

### GST Reports
- GST Summary: total taxable, CGST, SGST, IGST, ITC, net payable
- GST Detail Report: invoice-level tax breakdown
- **GSTR-1 JSON Export**: Download JSON for upload to GST portal
  - B2CS breakdown by GST rate
  - Filing period format (MMYYYY)
  - Invoice count and tax totals

### TDS Reports
- TDS Summary by section (194C, 194J, etc.)
- TDS Detail Report: bill-level deductions by vendor
- Vendor-wise TDS: total billed, deducted, deposited, pending
- **Form 16A Data**: Per-vendor TDS certificate data
  - Deductions per bill, challans filed, totals

### TDS Challans
- Record challan: number, section, amount, payment date, BSR code, bank
- List challans by section/FY

### Statutory Remittances
- Record remittance: type (GST/TDS/PF/ESI/PT), period, amount, date, reference
- Track filing history

### Compliance Calendar
- Statutory due dates for current financial year:
  - TDS: 7th of every month
  - GST GSTR-1: 11th after quarter end
  - GST GSTR-3B: 20th after quarter end
  - PT: April 30 annually
- Status tracking: upcoming | due_soon | overdue | completed
- Links to existing remittance records

---

## 18. Settings

### Society Configuration
- Name, address, logo, contact info
- GSTIN, PAN, TAN (for tax compliance)

### Financial Settings
- Financial year management
- Invoice template configuration
- Payment terms (due days)
- Platform fee percentage

### Roles & Permissions
- Matrix UI: roles × resources × permissions (Read/Write/Delete)
- 9 resources: units, invoices, receipts, vendors, purchases, bank, gate, tickets, documents
- Predefined defaults for each role
- Custom permission overrides

### Gates Configuration
- Multi-gate CRUD (under Settings)
- Gate type, location, status

---

## 19. Super Admin (Platform-wide)

- Cross-tenant dashboard: total societies, users, revenue
- Tenant list with stats
- Create new tenant (society onboarding)
- Tenant settings management
- User role assignments across tenants
- Member management per tenant

---

## Technical Details

### React Query Hooks (72 total)

**Finance** (38 hooks):
- Accounts: useAccountGroups, useLedgerAccounts, useFinancialYears, useJournalEntries, + CRUD mutations
- Invoices: useInvoices, useInvoiceRules, useGenerateInvoices, usePostInvoices, useCancelInvoice, useCalculateLPI, usePostLPI, useWaiveInterest
- Receipts: useReceipts, useCreateReceipt, useCreateCreditNote, useAdvances, useApplyAdvance
- Vendors: useVendors, useCreateVendor, useDeactivateVendor
- Purchases: usePurchaseRequests, useVendorBills, useCreatePR, useApprovePR, useRecordBillPayment, useVendorAging
- Payments: usePayments, usePaymentStats, useInitiateRefund
- Bank: useBankAccounts, useTransfers, useReconciliation, useBRS, useFDs, useStatementRows, useImportStatement, useCheques + CRUD
- Autopay: useAutopaySubscriptions, useAutopayCharges, useCancelAutopaySubscription

**Tax** (12 hooks):
- useGstSummary, useGstReport, useGstr1Export, useTdsSummary, useTdsVendors, useForm16A
- useChallans, useRemittances, useComplianceCalendar, useCreateChallan, useCreateRemittance

**Management** (22 hooks):
- Units: useUnits, useUnitMembers, useCreateUnit, useBulkImportUnits
- Gate: useGateStats, useVisitors, useCreateVisitor, useCheckInVisitor, useStaffLogs, useParcels
- Utilities: useMeters, useSlabs, useReadings, useBills, useCalculateBills, useBillToInvoice, useSubmitBulkReadings
- Tickets: useTickets, useTicketStats, useCreateTicket, useBulkCloseTickets, useBulkReassignTickets
- Announcements: useAnnouncements, useCreateAnnouncement, usePublishAnnouncement
- Staff: useStaffEmployees, useStaffShifts, useStaffAttendance, useStaffLeaves, useGates, useRbacPermissions
- Documents: useDocuments, useUploadDocument, useExpiringDocuments

---

## Known Limitations & Pending Items

| Item | Status | Notes |
|------|--------|-------|
| Tax reports UI pages | Hooks ready, UI pending | Data accessible via API, admin page not built |
| Compliance calendar UI | Hooks ready, UI pending | Calendar widget for settings/tax page |
| Autopay mandates tab | Hooks ready, UI pending | Tab on payments page |
| Bank statement import UI | Hooks ready, UI pending | Tab on bank page |
| Cheque register UI | Hooks ready, UI pending | Tab on bank page |
| Scheduled reports (email) | Not implemented | Auto-email monthly reports to committee |
| SMS/WhatsApp notifications | Not implemented | Sprint 5-7 (WhatsApp bot) |
| Advanced analytics | Not implemented | Predictive defaulter identification |
| Audit trail visualization | Not implemented | Historical change logs per entity |
| Workflow automation | Not implemented | Auto-approve purchases under threshold |
| Export to PDF/Excel | Partial | Some reports support download |
