// Auth
export {
  authKeys,
  useCurrentUser,
  useSendOtp,
  useVerifyOtp,
  useRefreshToken,
  useSwitchTenant,
} from './use-auth';

// Tenant settings (per-society Help & Support — QA #350; owner
// direct-onboard policy — QA #13-2a/2b)
export {
  helpContactKeys,
  useHelpContact,
  useUpdateHelpContact,
  ownerDirectOnboardKeys,
  useOwnerDirectOnboardSetting,
  useUpdateOwnerDirectOnboardSetting,
} from './use-tenant-settings';
export type {
  HelpContact,
  HelpContactCustomLink,
  OwnerDirectOnboardSetting,
} from './use-tenant-settings';

// CMS pages — Terms / Privacy per app target (QA Round 14 #14-2b)
export {
  cmsPageKeys,
  useCmsPage,
  useCmsPageHistory,
  useUpdateCmsPage,
} from './use-cms-pages';
export type {
  CmsAppTarget,
  CmsPageType,
  CmsPage,
  SaveCmsPageInput,
} from './use-cms-pages';

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
  useCreditNotes,
  downloadCreditNotePdf,
  useRecalculateArrears,
  useAdvances,
  useApplyAdvance,
} from './use-receipts';
export type { Advance, CreditNoteRow } from './use-receipts';

// Vendors
export {
  vendorKeys,
  useVendors,
  useVendor,
  useCreateVendor,
  useUpdateVendor,
  useDeactivateVendor,
} from './use-vendors';

// Customers (AR-side mirror of vendors — see migration 070)
export {
  customerKeys,
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeactivateCustomer,
  useConvertCustomerToUnit,
} from './use-customers';

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
  useEditBill,
  useCancelBill,
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
  useDeleteBankAccount,
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
  useUploadFileToS3,
  useUpdateDocument,
  useDeleteDocument,
  useExpiringDocuments,
  fetchPresignedDownloadUrl,
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
  useReconcilePending,
} from './use-payments';
export type { Payment, PaymentStats, PaymentFilters, PaymentReconcileSummary } from './use-payments';

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
  useSuperAdminUnitsForTenant,
  useRemoveUserRole,
} from './use-super-admin-users';
export type { SuperAdminUser, UserRoleDetail } from './use-super-admin-users';

// Platform-level config (read-only for tenant users)
export {
  useTaxRates,
  useUpdateGstRates,
  taxRatesKey,
  DEFAULT_GST_RATES,
} from './use-tax-rates';

// Role delegation (per-tenant supervisor-role toggles + expiry enforcement)
export {
  roleDelegationKeys,
  useRoleDelegation,
  useUpdateRoleDelegation,
} from './use-role-delegation';
export type {
  RoleDelegation,
  RoleDelegationUpdate,
  SecuritySupervisorPermissions,
  FacilitySupervisorPermissions,
  ExpiryEnforcement,
} from './use-role-delegation';

// Tenant lifecycle (onboarding / renewal / exit)
export {
  useCreateOnboarding,
  useRenewAgreement,
  isDuplicateOnboardError,
} from './use-tenant-lifecycle';
export type {
  CreateOnboardingInput,
  CreateOnboardingResult,
  RenewAgreementInput,
  RenewAgreementResult,
} from './use-tenant-lifecycle';

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
  useAnprLogs,
  useAnprScan,
  useUnrecognizedVehicles,
} from './use-gate';
export type {
  Visitor,
  StaffLog,
  Parcel,
  GateStats,
  AnprLog,
  UnrecognizedVehicle,
  VisitorFilters,
  MyVisitorFilters,
  StaffLogFilters,
  ParcelFilters,
  AnprLogFilters,
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
  useTdsConfig,
  useUpdateTenantTdsConfig,
  useSuggestTds,
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
  TdsSection,
  TdsConfig,
  ResolvedTdsConfig,
  TdsSuggestion,
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
  useCreateSublet,
  useCancelSublet,
} from './use-parking';
export type {
  ParkingSlot,
  Vehicle,
  ParkingSublet,
  SlotStats,
  SlotFilters,
  VehicleFilters,
  SubletFilters,
  CreateSubletInput,
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
  useGenerateBookingInvoice,
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
  useRecordPollMinutes,
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
  useTestSendTemplate,
  useSentNotifications,
  useMyNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from './use-notifications';
export type {
  NotificationTemplate,
  SentNotification,
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
  useTallyXmlUpload,
  useTallyCsvImport,
  useTallyCommitImport,
  useDownloadInvoicePdf,
} from './use-tally-import';
export type {
  TallyImportResult,
  TallyImportParseResult,
  TallyCommitResult,
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

// Governance (Resolutions + Elections)
export {
  governanceKeys,
  useResolutions,
  useResolution,
  useElections,
  useElection,
  useElectionResults,
  useCreateResolution,
  useProposeResolution,
  useWithdrawResolution,
  useRecordMinutes,
  useCreateElection,
  useCloseElection,
} from './use-governance';
export type {
  Resolution,
  Election,
  ElectionCandidate,
} from './use-governance';

// Ratings (Service Provider Ratings)
export {
  ratingKeys,
  useServiceRatings,
  useTopRated,
  useVerifyRating,
} from './use-ratings';
export type {
  ServiceRating,
  TopRatedProvider,
  RatingFilters,
} from './use-ratings';

// Analytics
export {
  analyticsKeys,
  useHealthScore,
  useHealthScoreTrend,
  useBenchmark,
  useAnomalies,
  useMaintenancePredictions,
} from './use-analytics';
export type {
  HealthScore,
  HealthScoreTrend,
  Anomaly,
  MaintenancePrediction,
  BenchmarkMetric,
} from './use-analytics';

// Gas Management
export {
  gasKeys,
  useGasPlans,
  useGasWallets,
  useGasTransactions,
  useGasStats,
  useCreateGasPlan,
  useRechargeWallet,
  useDispenseGas,
  usePendingRecharges,
  useDispenseRecharge,
} from './use-gas';
export type {
  GasPlan,
  GasWallet,
  GasTransaction,
  GasStats,
  GasManualRecharge,
} from './use-gas';

// Marketplace
export {
  marketplaceKeys,
  useMarketplaceListings,
  useRemoveListing,
} from './use-marketplace';
export type {
  MarketplaceListing,
} from './use-marketplace';

// Audit Trail
export {
  auditKeys,
  useAuditLog,
  useEntityHistory,
} from './use-audit';
export type {
  AuditEntry,
  AuditFilters,
} from './use-audit';

// Asset Management
export {
  assetKeys,
  useAssets,
  useAsset,
  useAssetDashboard,
  useAMCs,
  useExpiringAMCs,
  useServiceLogs,
  useCreateAsset,
  useUpdateAsset,
  useCreateAMC,
  useUpdateAMC,
  useLogService,
} from './use-assets';
export type {
  Asset,
  AMCContract,
  ServiceLog,
  AssetDashboard,
  AssetFilters,
  AMCFilters,
} from './use-assets';

// CCTV Cameras
export {
  cameraKeys,
  useCameras,
  useCreateCamera,
  useUpdateCamera,
  useDeleteCamera,
} from './use-cameras';
export type {
  Camera,
} from './use-cameras';

// Tally Export
export {
  tallyExportKeys,
  useTallyExportPreview,
  useTallyExport,
} from './use-tally-export';
export type {
  TallyExportOptions,
  TallyExportPreview,
} from './use-tally-export';

// Tenant admin management (community_admin grants/revokes admin/staff roles)
export {
  ADMIN_ROLE_ALLOW_LIST,
  tenantAdminKeys,
  useTenantAdmins,
  useAddTenantAdmin,
  useReplaceTenantAdminRoles,
  useRemoveTenantAdminRole,
} from './use-tenant-admins';
export type {
  AdminRoleSlug,
  TenantAdminRow,
  TenantAdminFilters,
  AddAdminInput,
  ReplaceAdminRolesInput,
  RemoveAdminRoleInput,
} from './use-tenant-admins';
