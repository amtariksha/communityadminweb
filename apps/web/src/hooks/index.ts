// Auth
export {
  authKeys,
  useCurrentUser,
  useSendOtp,
  useVerifyOtp,
  useRefreshToken,
  useSwitchTenant,
} from './use-auth';

// Units
export {
  unitKeys,
  useUnits,
  useUnit,
  useUnitStats,
  useBlocks,
  useUnitMembers,
  useCreateUnit,
  useUpdateUnit,
  useBulkImportUnits,
  useAddMember,
  useRemoveMember,
  useCsvImportUnits,
  useBulkImportMembers,
} from './use-units';
export type { CsvImportRow, CsvImportResult } from './use-units';

// Ledger
export {
  ledgerKeys,
  useAccountGroups,
  useAccountGroup,
  useCreateAccountGroup,
  useUpdateAccountGroup,
  useDeactivateAccountGroup,
  useLedgerAccounts,
  useLedgerAccount,
  useCreateLedgerAccount,
  useUpdateLedgerAccount,
  useSetOpeningBalance,
  useBulkImportBalances,
  useFinancialYears,
  useCreateFinancialYear,
  useSetCurrentYear,
  useFreezeYear,
  useUnfreezeYear,
  useJournalEntries,
  useJournalEntry,
  useCreateJournalEntry,
  useReverseJournalEntry,
  useTrialBalance,
  useBalanceSheet,
  useIncomeExpenditure,
  useGeneralLedgerReport,
} from './use-ledger';

// Invoices
export {
  invoiceKeys,
  useInvoices,
  useInvoice,
  useInvoiceRules,
  useCreateInvoiceRule,
  useUpdateInvoiceRule,
  useGenerateInvoices,
  usePostInvoices,
  useCancelInvoice,
  useBulkUpdateDueDates,
  useDefaulters,
  useCalculateLPI,
  usePostLPI,
  useWaiveInterest,
} from './use-invoices';

// Receipts
export {
  receiptKeys,
  useReceipts,
  useReceipt,
  useCreateReceipt,
  useBulkImportReceipts,
  useUnallocatedCredits,
  useReceiptSummary,
  useCreateCreditNote,
  useRecalculateArrears,
  useAdvances,
  useApplyAdvance,
} from './use-receipts';
export type { Advance } from './use-receipts';

// Vendors
export {
  vendorKeys,
  useVendors,
  useVendor,
  useCreateVendor,
  useUpdateVendor,
  useDeactivateVendor,
} from './use-vendors';

// Purchases
export {
  purchaseKeys,
  usePurchaseRequests,
  usePurchaseRequest,
  useCreatePR,
  useApprovePR,
  useRejectPR,
  useConvertPRToBill,
  useVendorBills,
  useVendorBill,
  useCreateBill,
  useRecordBillPayment,
  useVendorAging,
} from './use-purchases';

// Bank
export {
  bankKeys,
  useBankAccounts,
  useBankAccount,
  useCreateBankAccount,
  useUpdateBankAccount,
  useBankTransfers,
  useCreateTransfer,
  useReconciliation,
  useReconcileTransaction,
  useBRSSummary,
  useFixedDeposits,
  useCreateFD,
  useMatureFD,
  useRenewFD,
  useStatementRows,
  useImportStatement,
  useManualMatchRow,
  useExcludeRow,
  useCheques,
  useIssueCheque,
  useClearCheque,
  useBounceCheque,
  useCancelCheque,
} from './use-bank';
export type { StatementRow, Cheque } from './use-bank';

// Documents
export {
  documentKeys,
  useDocumentCategories,
  useCreateCategory,
  useDocuments,
  useDocument,
  useUploadDocument,
  useUpdateDocument,
  useDeleteDocument,
  useExpiringDocuments,
} from './use-documents';

// Payments
export {
  paymentKeys,
  usePayments,
  usePayment,
  usePaymentStats,
  useCreatePaymentOrder,
  useVerifyPayment,
  useInitiateRefund,
} from './use-payments';
export type { Payment, PaymentStats, PaymentFilters } from './use-payments';

// Tenants
export {
  tenantKeys,
  useTenants,
  useTenant,
  useCreateTenant,
  useUpdateTenant,
  useTenantSettings,
  useTenantStats,
  useSuperAdminDashboard,
} from './use-tenants';

// Dashboard
export {
  dashboardKeys,
  useDashboardData,
} from './use-dashboard';

// Super Admin Users
export {
  superAdminUserKeys,
  useSuperAdminUsers,
  useSuperAdminUserRoles,
  useAssignUserRole,
  useRemoveUserRole,
} from './use-super-admin-users';
export type { SuperAdminUser, UserRoleDetail } from './use-super-admin-users';

// Tenant Members (Super Admin)
export {
  tenantMemberKeys,
  useTenantMembers,
  useAddMemberToTenant,
  useUpdateTenantMember,
  useRemoveTenantMember,
  useAddMemberWithRoles,
} from './use-tenant-members';
export type { TenantMember, AddMemberResult } from './use-tenant-members';

// Gate Management
export {
  gateKeys,
  useGateStats,
  useVisitors,
  useMyVisitors,
  useCreateVisitor,
  useWalkInVisitor,
  useVerifyVisitorOtp,
  useCheckInVisitor,
  useCheckOutVisitor,
  useCancelVisitor,
  useStaffLogs,
  useStaffCheckIn,
  useStaffCheckOut,
  useParcels,
  useCreateParcel,
  useCollectParcel,
} from './use-gate';
export type {
  Visitor,
  StaffLog,
  Parcel,
  GateStats,
  VisitorFilters,
  MyVisitorFilters,
  StaffLogFilters,
  ParcelFilters,
} from './use-gate';

// Tickets
export {
  ticketKeys,
  useTickets,
  useMyTickets,
  useTicket,
  useTicketStats,
  useTicketCategories,
  useCreateTicket,
  useUpdateTicket,
  useAddTicketComment,
  useBulkCloseTickets,
  useBulkReassignTickets,
} from './use-tickets';
export type { Ticket, TicketComment, TicketStats, TicketFilters } from './use-tickets';

// Tax & Compliance
export {
  taxKeys,
  useGstSummary,
  useGstReport,
  useGstr1Export,
  useTdsSummary,
  useTdsVendors,
  useForm16A,
  useChallans,
  useRemittances,
  useComplianceCalendar,
  useCreateChallan,
  useCreateRemittance,
} from './use-tax';
export type {
  GstSummary,
  GstReportRow,
  Gstr1Export,
  TdsSummary,
  Form16AData,
  ComplianceItem,
  TdsChallan,
  Remittance,
  TaxPeriodFilters,
} from './use-tax';

// Autopay
export {
  autopayKeys,
  useAutopaySubscriptions,
  useAutopaySubscription,
  useUnitSubscriptions,
  useAutopayCharges,
  useCreateAutopaySubscription,
  usePauseSubscription,
  useResumeSubscription,
  useCancelAutopaySubscription,
} from './use-autopay';
export type {
  AutopaySubscription,
  AutopayCharge,
  AutopayFilters,
} from './use-autopay';

// Announcements
export {
  announcementKeys,
  useAnnouncements,
  useActiveAnnouncements,
  useAnnouncement,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  usePublishAnnouncement,
  useDeleteAnnouncement,
} from './use-announcements';
export type { Announcement, AnnouncementFilters } from './use-announcements';

// OCR
export {
  useOcrInvoice,
  useOcrMeterReading,
  useOcrIdDocument,
  useOcrText,
  fileToBase64,
} from './use-ocr';
export type {
  InvoiceOcrResult,
  MeterReadingOcrResult,
  IdDocumentOcrResult,
  GenericOcrResult,
} from './use-ocr';

// Utilities
export {
  utilityKeys,
  useUtilityStats,
  useMeters,
  useReadings,
  useSlabs,
  useUtilityBills,
  useCreateMeter,
  useUpdateMeter,
  useSubmitReading,
  useSubmitBulkReadings,
  useCreateSlab,
  useUpdateSlab,
  useDeleteSlab,
  useCalculateBills,
  useBillToInvoice,
} from './use-utilities';
export type {
  Meter,
  Reading,
  Slab,
  UtilityBill,
  UtilityStats,
  MeterFilters,
  BillFilters,
} from './use-utilities';

// Parking
export {
  parkingKeys,
  useSlots,
  useSlotStats,
  useVehicles,
  useSublets,
  useCreateSlot,
  useBulkCreateSlots,
  useAssignSlot,
  useDeallocateSlot,
  useRegisterVehicle,
  useUpdateVehicle,
  useRemoveVehicle,
} from './use-parking';
export type {
  ParkingSlot,
  Vehicle,
  ParkingSublet,
  SlotStats,
  SlotFilters,
  VehicleFilters,
  SubletFilters,
} from './use-parking';

// Approvals
export {
  approvalKeys,
  useMyPendingApprovals,
  useMyPendingCount,
  useApprovalRequests,
  useApprovalDetail,
  useApproveRequest,
  useRejectRequest,
  useCancelRequest,
} from './use-approvals';
export type {
  ApprovalRequest,
  ApprovalStep,
  ApprovalDetail,
  ApprovalFilters,
} from './use-approvals';

// Amenities
export {
  amenityKeys,
  useAmenities,
  useAmenitySlots,
  useAmenityBookings,
  useCreateAmenity,
  useUpdateAmenity,
  useCreateBooking,
  useCancelBooking,
} from './use-amenities';
export type {
  Amenity,
  AmenitySlot,
  AmenityBooking,
  AmenityBookingFilters,
} from './use-amenities';

// Voting
export {
  votingKeys,
  usePolls,
  usePoll,
  useActivePolls,
  useCreatePoll,
  useCastVote,
  useClosePoll,
} from './use-voting';
export type {
  Poll,
  PollOption,
  PollVote,
  PollResult,
  PollFilters,
} from './use-voting';

// Notifications
export {
  notificationKeys,
  useNotificationTemplates,
  useCreateTemplate,
  useSendTemplate,
  useMyNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from './use-notifications';
export type {
  NotificationTemplate,
  Notification,
  NotificationTemplateFilters,
  MyNotificationFilters,
} from './use-notifications';

// Staff Management
export {
  staffKeys,
  gateConfigKeys,
  rbacKeys,
  useStaffEmployees,
  useStaffEmployee,
  useStaffShifts,
  useStaffAssignments,
  useStaffAttendance,
  useAttendanceSummary,
  useStaffLeaves,
  useGates,
  useRbacPermissions,
  useCreateEmployee,
  useUpdateEmployee,
  useDeactivateEmployee,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useAssignStaff,
  useClockIn,
  useClockOut,
  useApplyLeave,
  useApproveLeave,
  useRejectLeave,
  useCreateGate,
  useUpdateGate,
  useDeleteGate,
  useUpdatePermission,
  useSeedPermissions,
} from './use-staff';
export type {
  Staff,
  Shift,
  ShiftAssignment,
  Attendance,
  Leave,
  AttendanceSummary,
  Gate,
  RbacPermission,
  StaffFilters,
  AttendanceFilters,
  LeaveFilters,
} from './use-staff';

// Tenant Features
export {
  tenantFeatureKeys,
  useEnabledFeatures,
  useUpdateFeatures,
} from './use-tenant-features';

// Platform Config (Super Admin)
export {
  platformConfigKeys,
  usePlatformConfig,
  usePlatformConfigByKey,
  useUpdatePlatformConfig,
} from './use-platform-config';
export type { PlatformConfigItem } from './use-platform-config';

// Tally Import
export {
  tallyImportKeys,
  useTallyImportHistory,
  useTallyXmlImport,
  useTallyCsvImport,
  useDownloadInvoicePdf,
} from './use-tally-import';
export type {
  TallyImportResult,
  TallyImportHistory,
} from './use-tally-import';

// Unit Members (Detail, Directory, Occupancy)
export {
  unitMemberKeys,
  useUnitDetail,
  useMemberDirectory,
  useOccupancyReport,
  useUpdateMemberDetail,
  useTransferOwnership,
  useDisconnectTenant,
} from './use-unit-members';
export type {
  UnitDetailMember,
  UnitDetailResponse,
  DirectoryMember,
  OccupancyReport,
  OccupancyBlockBreakdown,
  OccupancyTimelineEntry,
  DirectoryFilters,
  UpdateMemberInput,
  TransferOwnershipInput,
  DisconnectTenantInput,
} from './use-unit-members';
