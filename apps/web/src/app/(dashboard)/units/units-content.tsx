'use client';

import { useRef, useState, useCallback, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Home,
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Pencil,
  ArrowRightLeft,
  UserMinus,
  Users,
  Clock,
  Phone,
  Sparkles,
  Mail,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { FormFieldError } from '@/components/ui/form-field-error';
import { normalizePhone, validateName } from '@/lib/validation';
import {
  useUnits,
  useUnitStats,
  useBlocks,
  useCreateUnit,
  useUpdateUnit,
  useAddMember,
  useRemoveMember,
  useUnitDetail,
  useUpdateMemberDetail,
  useTransferOwnership,
  useDisconnectTenant,
  useBulkImportMembers,
  useCreateOnboarding,
  isDuplicateOnboardError,
} from '@/hooks';
import type { UnitDetailMember } from '@/hooks';
import { useOcrIdDocument } from '@/hooks/use-ocr';
import { cn, formatDate } from '@/lib/utils';
import { ClickablePhone, ClickableEmail } from '@/components/ui/clickable-contact';
import { UserSearchSelect } from '@/components/ui/user-search-select';
import type { UserSearchHit } from '@/hooks/use-user-search';

const ITEMS_PER_PAGE = 20;

function getUnitTypeLabel(type: string | null | undefined): string {
  // 2026-05 — DTO + UI now share the canonical 3-value enum
  // (residential / commercial / parking). Older legacy UI labels
  // (flat / shop / office / other) are still mapped here for any
  // residual data that might surface during migration / repair —
  // they fall back to a sensible canonical-equivalent badge.
  if (!type) return 'Unit';
  switch (type) {
    case 'residential':
      return 'Residential';
    case 'commercial':
      return 'Commercial';
    case 'parking':
      return 'Parking only';
    // Legacy UI-label mappings (read-side fallback only).
    case 'flat':
      return 'Residential';
    case 'shop':
    case 'office':
      return 'Commercial';
    case 'other':
      return 'Residential';
    default:
      return type;
  }
}

function getMemberTypeBadge(type: string): ReactNode {
  switch (type) {
    case 'owner':
      return <Badge variant="default">Owner</Badge>;
    case 'tenant':
      return <Badge variant="warning">Tenant</Badge>;
    case 'owner_family':
      return <Badge variant="outline">Owner Family</Badge>;
    case 'tenant_family':
      return <Badge variant="outline">Tenant Family</Badge>;
    case 'family_member':
      return <Badge variant="outline">Family</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

function StatsCardsSkeleton(): ReactNode {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-10" /></TableCell>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-5 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-5" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Member Card Component
// ---------------------------------------------------------------------------

function MemberCard({
  member,
  unitId,
  onEdit,
  onRemove,
  isRemoving,
}: {
  member: UnitDetailMember;
  unitId: string;
  onEdit: (member: UnitDetailMember) => void;
  onRemove: (memberId: string) => void;
  isRemoving: boolean;
}): ReactNode {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{member.name ?? 'Unknown'}</p>
        {member.phone && (
          <p className="flex items-center gap-1 text-xs">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <ClickablePhone phone={member.phone} />
          </p>
        )}
        {member.email && (
          <p className="flex items-center gap-1 text-xs">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <ClickableEmail email={member.email} />
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Since {formatDate(member.move_in_date)}
        </p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onEdit(member)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          disabled={isRemoving}
          onClick={() => onRemove(member.id)}
        >
          <UserMinus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UnitsContent(): ReactNode {
  const router = useRouter();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [blockFilter, setBlockFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create unit dialog state
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [formUnitNumber, setFormUnitNumber] = useState('');
  const [formBlock, setFormBlock] = useState('');
  const [formFloor, setFormFloor] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formUnitType, setFormUnitType] = useState('residential');

  // Unit detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailUnitId, setDetailUnitId] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'members' | 'history'>('members');

  // Edit unit form (Details tab)
  const [editUnitNumber, setEditUnitNumber] = useState('');
  const [editBlock, setEditBlock] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editUnitType, setEditUnitType] = useState('residential');
  const [editIsActive, setEditIsActive] = useState(true);

  // Edit member dialog state
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [editMemberId, setEditMemberId] = useState('');
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editMemberEmail, setEditMemberEmail] = useState('');

  // Transfer ownership dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferName, setTransferName] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [transferMoveIn, setTransferMoveIn] = useState('');

  // Disconnect tenant dialog
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  // Import members dialog state
  const [importMembersOpen, setImportMembersOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Add member dialog (family / tenant)
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberName, setAddMemberName] = useState('');
  const [addMemberPhone, setAddMemberPhone] = useState('');
  const [addMemberType, setAddMemberType] = useState('owner_family');
  const [addMemberParentId, setAddMemberParentId] = useState('');
  const [addMemberMoveIn, setAddMemberMoveIn] = useState('');

  // QA #219 / #222 — Onboard Tenant dialog. Captures the full lease
  // packet (start/end, rent, deposit) and creates a tenant_onboarding
  // record + approval request. Distinct from the lightweight Add Member
  // (member_type='tenant') flow, which only writes a `members` row
  // without a lease — kept for backwards compat but not surfaced from
  // the tenant section anymore.
  const [onboardTenantOpen, setOnboardTenantOpen] = useState(false);
  const [onboardName, setOnboardName] = useState('');
  const [onboardPhone, setOnboardPhone] = useState('');
  const [onboardEmail, setOnboardEmail] = useState('');
  const [onboardLeaseStart, setOnboardLeaseStart] = useState('');
  const [onboardLeaseEnd, setOnboardLeaseEnd] = useState('');
  const [onboardMonthlyRent, setOnboardMonthlyRent] = useState('');
  const [onboardSecurityDeposit, setOnboardSecurityDeposit] = useState('');
  // Unified user-directory wiring (migration 056 / UserSearchSelect).
  // `addMemberSelected` is the directory hit picked from autocomplete;
  // when set, the form submits with that user's exact phone (and the
  // server's findOrCreateUser will reuse the existing users row instead
  // of creating a duplicate). On no-match the operator keeps typing
  // and `addMemberPhone` carries the typed value through silently.
  const [addMemberSelected, setAddMemberSelected] = useState<UserSearchHit | null>(null);
  // Family-member-without-phone path: minors / elderly without their
  // own mobile. members.user_id stays NULL; the parent_member_id link
  // is what represents them in visitor logs and resident lists.
  const [addMemberNoPhone, setAddMemberNoPhone] = useState(false);
  // ID scan (Aadhaar / PAN / Passport / Voter / DL). Auto-fills Name;
  // other fields (document_number, DOB, gender) are surfaced in a
  // toast for the admin to record manually — the lightweight
  // add-member endpoint doesn't currently persist them.
  const idFileInputRef = useRef<HTMLInputElement | null>(null);
  const ocrIdDoc = useOcrIdDocument();
  const [idScanSummary, setIdScanSummary] = useState<string | null>(null);
  const MAX_OCR_BYTES = 10 * 1024 * 1024;

  // Queries
  const blocksQuery = useBlocks();
  const blocks = blocksQuery.data ?? [];

  const unitsQuery = useUnits({
    search: searchQuery || undefined,
    block: blockFilter || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const statsQuery = useUnitStats();
  const unitDetailQuery = useUnitDetail(detailUnitId);

  // Mutations
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const addMember = useAddMember();
  const removeMember = useRemoveMember();
  const updateMemberDetail = useUpdateMemberDetail();
  const transferOwnership = useTransferOwnership();
  const disconnectTenant = useDisconnectTenant();
  const bulkImportMembers = useBulkImportMembers();
  const createOnboarding = useCreateOnboarding();

  const units = unitsQuery.data?.data ?? [];
  const totalUnits = unitsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUnits / ITEMS_PER_PAGE));
  const stats = statsQuery.data;
  const detail = unitDetailQuery.data;

  // Derived member groups
  const owner = detail?.current_members.find((m) => m.member_type === 'owner') ?? null;
  const ownerFamily = detail?.current_members.filter(
    (m) => m.member_type === 'owner_family' || (m.member_type === 'family_member' && m.parent_member_id === owner?.id),
  ) ?? [];
  const tenant = detail?.current_members.find((m) => m.member_type === 'tenant') ?? null;
  const tenantFamily = detail?.current_members.filter(
    (m) => m.member_type === 'tenant_family' || (m.member_type === 'family_member' && m.parent_member_id === tenant?.id),
  ) ?? [];

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleSearch(): void {
    setSearchQuery(searchInput);
    setPage(1);
  }

  const handleDownloadMemberTemplate = useCallback(function downloadTemplate(): void {
    const headers = 'unit_number,name,phone,member_type,email,move_in_date';
    const sampleRow = 'A-101,John Doe,9876543210,owner,john@example.com,2024-01-15';
    const csv = `${headers}\n${sampleRow}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'member_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  function handleImportMembers(): void {
    const lines = importCsvText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      addToast({ title: 'CSV is empty', variant: 'destructive' });
      return;
    }

    // Skip header row if it looks like headers
    const firstLine = lines[0].toLowerCase();
    const dataLines =
      firstLine.includes('unit_number') || firstLine.includes('name')
        ? lines.slice(1)
        : lines;

    if (dataLines.length === 0) {
      addToast({ title: 'No data rows found in CSV', variant: 'destructive' });
      return;
    }

    const validTypes = ['owner', 'tenant', 'owner_family', 'tenant_family'] as const;

    const members = dataLines.map(function parseLine(line) {
      const parts = line.split(',').map((p) => p.trim());
      return {
        unit_number: parts[0] ?? '',
        name: parts[1] ?? '',
        phone: parts[2] ?? '',
        member_type: (validTypes.includes(parts[3] as typeof validTypes[number])
          ? parts[3]
          : 'owner') as 'owner' | 'tenant' | 'owner_family' | 'tenant_family',
        email: parts[4] || undefined,
        move_in_date: parts[5] || undefined,
      };
    });

    bulkImportMembers.mutate(
      { members },
      {
        onSuccess(response) {
          const result = response.data;
          setImportResult(result);
          addToast({
            title: `Imported ${result.imported} members, ${result.skipped} skipped`,
            variant: result.errors.length > 0 ? 'warning' : 'success',
          });
        },
        onError(error) {
          addToast({ title: 'Import failed', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function resetUnitForm(): void {
    setFormUnitNumber('');
    setFormBlock('');
    setFormFloor('');
    setFormArea('');
    setFormUnitType('flat');
  }

  function handleAddUnit(e: FormEvent): void {
    e.preventDefault();
    // Unit-picker handoff (2026-04-23): the guard Flutter app renders
    // Step-1 block tiles from DISTINCT blocks, so every NEW unit must
    // have a block. Older rows (block IS NULL) are tolerated by
    // migration 051's backfill + the `units_needing_backfill` view,
    // but we don't create new orphans.
    const normalizedBlock = formBlock.trim().toUpperCase();
    if (!normalizedBlock) {
      addToast({
        title: 'Block is required',
        description:
          'The guard app groups units by block. Enter the block this unit belongs to (e.g. A, B, Tower1).',
        variant: 'destructive',
      });
      return;
    }
    const floorNum = Number(formFloor);
    if (!Number.isInteger(floorNum) || floorNum < -5 || floorNum > 200) {
      addToast({
        title: 'Floor must be a whole number between -5 and 200',
        variant: 'destructive',
      });
      return;
    }
    createUnit.mutate(
      {
        unit_number: formUnitNumber,
        block: normalizedBlock,
        floor: floorNum,
        area_sqft: Number(formArea),
        unit_type: formUnitType,
      },
      {
        onSuccess() {
          setUnitDialogOpen(false);
          resetUnitForm();
          addToast({ title: 'Unit added successfully', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to add unit', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function openDetailDialog(unit: {
    id: string;
    unit_number: string;
    block?: string | null;
    floor: number;
    area_sqft: number;
    unit_type: string;
    is_active: boolean;
  }): void {
    setDetailUnitId(unit.id);
    setEditUnitNumber(unit.unit_number);
    setEditBlock(unit.block ?? '');
    setEditFloor(String(unit.floor));
    setEditArea(String(unit.area_sqft));
    setEditUnitType(unit.unit_type);
    setEditIsActive(unit.is_active);
    setActiveTab('members');
    setDetailDialogOpen(true);
  }

  function handleEditUnit(e: FormEvent): void {
    e.preventDefault();
    // Mirror the create-form guard — edits are the primary channel
    // for ops to backfill block/floor on legacy rows, so we also
    // soft-enforce here.
    const normalizedBlock = editBlock.trim().toUpperCase();
    if (!normalizedBlock) {
      addToast({
        title: 'Block is required',
        description:
          'Every unit needs a block for the guard app\'s unit picker.',
        variant: 'destructive',
      });
      return;
    }
    const floorNum = Number(editFloor);
    if (!Number.isInteger(floorNum) || floorNum < -5 || floorNum > 200) {
      addToast({
        title: 'Floor must be a whole number between -5 and 200',
        variant: 'destructive',
      });
      return;
    }
    updateUnit.mutate(
      {
        id: detailUnitId,
        data: {
          unit_number: editUnitNumber,
          block: normalizedBlock,
          floor: floorNum,
          area_sqft: Number(editArea),
          unit_type: editUnitType,
          is_active: editIsActive,
        },
      },
      {
        onSuccess() {
          addToast({ title: 'Unit updated successfully', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to update unit', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function openEditMember(member: UnitDetailMember): void {
    setEditMemberId(member.id);
    setEditMemberName(member.name ?? '');
    setEditMemberPhone(member.phone ?? '');
    setEditMemberEmail(member.email ?? '');
    setEditMemberOpen(true);
  }

  function handleEditMember(e: FormEvent): void {
    e.preventDefault();
    const phone = normalizePhone(editMemberPhone);
    if (!phone.ok) {
      addToast({
        title: 'Invalid phone number',
        description: phone.error,
        variant: 'destructive',
      });
      return;
    }
    updateMemberDetail.mutate(
      {
        unitId: detailUnitId,
        memberId: editMemberId,
        name: editMemberName || undefined,
        phone: phone.value || undefined,
        email: editMemberEmail || null,
      },
      {
        onSuccess() {
          setEditMemberOpen(false);
          addToast({ title: 'Member updated', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to update member', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleRemoveMember(memberId: string): void {
    removeMember.mutate(
      { unitId: detailUnitId, memberId },
      {
        onSuccess() {
          addToast({ title: 'Member removed', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to remove member', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleTransferOwnership(e: FormEvent): void {
    e.preventDefault();
    // QA #86 — normalize phone to canonical +91XXXXXXXXXX before send
    // so the API accepts the same value whether tester typed 10 digits
    // or prefixed +91.
    const phone = normalizePhone(transferPhone);
    if (!phone.ok || !phone.value) {
      addToast({
        title: 'Invalid phone number',
        description: phone.ok ? 'Phone is required.' : phone.error,
        variant: 'destructive',
      });
      return;
    }
    const name = validateName(transferName);
    if (!name.ok) {
      addToast({
        title: 'Invalid name',
        description: name.error,
        variant: 'destructive',
      });
      return;
    }
    transferOwnership.mutate(
      {
        unitId: detailUnitId,
        name: name.value,
        phone: phone.value,
        email: transferEmail || undefined,
        move_in_date: transferMoveIn || undefined,
      },
      {
        onSuccess() {
          setTransferOpen(false);
          setTransferName('');
          setTransferPhone('');
          setTransferEmail('');
          setTransferMoveIn('');
          addToast({ title: 'Ownership transferred successfully', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Transfer failed', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleDisconnectTenant(): void {
    disconnectTenant.mutate(
      { unitId: detailUnitId },
      {
        onSuccess() {
          setDisconnectOpen(false);
          addToast({ title: 'Tenant disconnected', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to disconnect tenant', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function openAddFamilyMember(parentId: string, memberType: string): void {
    setAddMemberParentId(parentId);
    setAddMemberType(memberType);
    setAddMemberName('');
    setAddMemberPhone('');
    setAddMemberMoveIn('');
    setAddMemberSelected(null);
    setAddMemberNoPhone(false);
    setAddMemberOpen(true);
  }

  function openAddTenant(): void {
    setAddMemberParentId('');
    setAddMemberType('tenant');
    setAddMemberName('');
    setAddMemberPhone('');
    setAddMemberMoveIn('');
    setAddMemberSelected(null);
    setAddMemberNoPhone(false);
    setAddMemberOpen(true);
  }

  // QA #219 / #222 — full tenant onboarding with lease packet.
  function openOnboardTenant(): void {
    setOnboardName('');
    setOnboardPhone('');
    setOnboardEmail('');
    // Sensible defaults: lease starts today, 11-month term (the
    // standard Indian rental tenancy length).
    const today = new Date();
    const elevenMonths = new Date(today);
    elevenMonths.setMonth(elevenMonths.getMonth() + 11);
    setOnboardLeaseStart(today.toISOString().slice(0, 10));
    setOnboardLeaseEnd(elevenMonths.toISOString().slice(0, 10));
    setOnboardMonthlyRent('');
    setOnboardSecurityDeposit('');
    setOnboardTenantOpen(true);
  }

  function handleOnboardTenantSubmit(e: FormEvent): void {
    e.preventDefault();
    const phone = normalizePhone(onboardPhone);
    if (!phone.ok || !phone.value) {
      addToast({
        title: 'Invalid tenant phone',
        description: phone.ok ? 'Phone is required.' : phone.error,
        variant: 'destructive',
      });
      return;
    }
    if (!onboardName.trim()) {
      addToast({
        title: 'Name required',
        description: 'Tenant name is required to start onboarding.',
        variant: 'destructive',
      });
      return;
    }
    if (!onboardLeaseStart || !onboardLeaseEnd) {
      addToast({
        title: 'Lease dates required',
        description: 'Pick both lease start and end dates.',
        variant: 'destructive',
      });
      return;
    }
    if (onboardLeaseEnd <= onboardLeaseStart) {
      addToast({
        title: 'Invalid lease window',
        description: 'Lease end date must be after lease start date.',
        variant: 'destructive',
      });
      return;
    }

    const monthlyRent = onboardMonthlyRent ? Number(onboardMonthlyRent) : null;
    const securityDeposit = onboardSecurityDeposit
      ? Number(onboardSecurityDeposit)
      : null;
    if (monthlyRent !== null && (!Number.isFinite(monthlyRent) || monthlyRent <= 0)) {
      addToast({
        title: 'Invalid monthly rent',
        description: 'Monthly rent must be a positive number, or leave blank.',
        variant: 'destructive',
      });
      return;
    }
    if (
      securityDeposit !== null &&
      (!Number.isFinite(securityDeposit) || securityDeposit < 0)
    ) {
      addToast({
        title: 'Invalid security deposit',
        description: 'Security deposit must be zero or positive, or leave blank.',
        variant: 'destructive',
      });
      return;
    }

    createOnboarding.mutate(
      {
        unit_id: detailUnitId,
        tenant_name: onboardName.trim(),
        tenant_phone: phone.value,
        tenant_email: onboardEmail.trim() || null,
        lease_start_date: onboardLeaseStart,
        lease_end_date: onboardLeaseEnd,
        monthly_rent: monthlyRent,
        security_deposit: securityDeposit,
      },
      {
        onSuccess() {
          setOnboardTenantOpen(false);
          addToast({
            title: 'Tenant onboarding submitted',
            description:
              'A pending approval was created. Once a community admin / committee member approves, the tenant becomes active on this unit.',
            variant: 'success',
          });
        },
        onError(error) {
          // QA #13-2c (Round 12 #12-1d carry-over) — when the
          // unit is already past the onboarding step (approval
          // landed, or pending request still queued, or admin's
          // role check fails because the precondition changed),
          // the backend rejects with one of three specific
          // BadRequest strings. Detect those and show a clearer
          // "tenant already onboarded — refresh" message instead
          // of forwarding what reads as a confusing
          // permission-flavoured error. The hook's onSuccess
          // already invalidates `['unit-members']` (covers
          // useUnitDetail via prefix match), but the error path
          // doesn't — so close the dialog AND tell the admin
          // their view is stale, prompting a manual refresh that
          // pulls the now-current member list.
          if (isDuplicateOnboardError(error)) {
            setOnboardTenantOpen(false);
            addToast({
              title: 'Tenant already onboarded',
              description:
                'This unit already has a tenant or a pending onboarding request. Refresh the page to see the current status.',
              variant: 'destructive',
            });
            return;
          }
          addToast({
            title: 'Failed to start onboarding',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  async function handleScanIdDocument(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_OCR_BYTES) {
      addToast({
        title: 'Photo too large',
        description: `Max ${MAX_OCR_BYTES / (1024 * 1024)} MiB for AI scanning.`,
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await ocrIdDoc.mutateAsync(file);
      if (result.name) setAddMemberName(result.name);
      // Compose a summary of everything else so the admin can record
      // what didn't auto-fill. document_number for Aadhaar comes pre-
      // masked from the backend (middle 8 digits hidden).
      const parts: string[] = [];
      if (result.document_type && result.document_type !== 'unknown') {
        parts.push(result.document_type.toUpperCase());
      }
      if (result.document_number) parts.push(`#${result.document_number}`);
      if (result.date_of_birth) parts.push(`DOB ${result.date_of_birth}`);
      if (result.gender) parts.push(result.gender);
      setIdScanSummary(parts.length > 0 ? parts.join(' · ') : null);
      addToast({
        title: result.name ? `Scanned: ${result.name}` : 'Could not read name — review manually',
        description:
          parts.length > 0
            ? `Also extracted: ${parts.join(', ')} (${Math.round((result.confidence ?? 0) * 100)}% confidence)`
            : `Confidence ${Math.round((result.confidence ?? 0) * 100)}%`,
        variant: result.name ? 'success' : 'default',
      });
    } catch (err) {
      addToast({
        title: 'AI extraction failed',
        description:
          (err as Error).message ?? 'Please enter the details manually.',
        variant: 'destructive',
      });
    }
  }

  function handleAddMember(e: FormEvent): void {
    e.preventDefault();
    const isFamily =
      addMemberType === 'owner_family' || addMemberType === 'tenant_family';
    const allowNoPhone = isFamily && addMemberNoPhone;

    // Phone source: prefer the directory hit (no duplicate users row),
    // fall back to the typed value, fall back to empty (no-phone family
    // member). The server's findOrCreateUser dedupes when a phone is
    // present but unselected (silent no-match flow per the plan).
    const rawPhone = addMemberSelected?.phone ?? addMemberPhone;
    let phoneValue: string | undefined;
    if (allowNoPhone && !rawPhone.trim()) {
      phoneValue = undefined;
    } else {
      const phone = normalizePhone(rawPhone);
      if (!phone.ok) {
        addToast({
          title: 'Invalid phone number',
          description: phone.error,
          variant: 'destructive',
        });
        return;
      }
      phoneValue = phone.value || undefined;
    }

    const name = validateName(addMemberName);
    if (!name.ok) {
      addToast({
        title: 'Invalid name',
        description: name.error,
        variant: 'destructive',
      });
      return;
    }
    addMember.mutate(
      {
        unit_id: detailUnitId,
        name: name.value,
        phone: phoneValue,
        member_type: addMemberType,
        move_in_date: addMemberMoveIn,
        ...(addMemberParentId ? { parent_member_id: addMemberParentId } : {}),
      } as Parameters<typeof addMember.mutate>[0],
      {
        onSuccess() {
          setAddMemberOpen(false);
          addToast({ title: 'Member added', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to add member', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Units' }]}
        title="Units"
        description="Manage apartment units — add, edit, import, and assign members"
        actions={
          <>
            <ExportButton
              data={units as unknown as Record<string, unknown>[]}
              filename={`units-${new Date().toISOString().split('T')[0]}`}
              columns={[
                { key: 'unit_number', label: 'Unit #' },
                { key: 'block', label: 'Block' },
                { key: 'floor', label: 'Floor' },
                { key: 'unit_type', label: 'Type' },
                { key: 'area_sqft', label: 'Area (sqft)' },
                { key: 'owner_name', label: 'Owner' },
              ]}
            />
            <Button variant="outline" onClick={() => router.push('/units/directory')}>
              <Users className="mr-2 h-4 w-4" />
              Member Directory
            </Button>
            <Button variant="outline" onClick={() => router.push('/units/import')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import from App
            </Button>

            <Dialog
              open={importMembersOpen}
              onOpenChange={(open) => {
                setImportMembersOpen(open);
                if (!open) {
                  setImportCsvText('');
                  setImportResult(null);
                }
              }}
            >
              <DialogTrigger>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import Members
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Bulk Import Members</DialogTitle>
                  <DialogDescription>
                    Paste CSV data to import members into units. Format: unit_number, name, phone, member_type, email, move_in_date
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadMemberTemplate}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>

                  <div className="space-y-2">
                    <Label htmlFor="import-csv">CSV Data</Label>
                    <textarea
                      id="import-csv"
                      className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder={`unit_number,name,phone,member_type,email,move_in_date\nA-101,John Doe,9876543210,owner,john@example.com,2024-01-15`}
                      value={importCsvText}
                      onChange={(e) => setImportCsvText(e.target.value)}
                    />
                  </div>

                  {importResult && (
                    <div className="space-y-2 rounded-md border p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">
                          Imported: {importResult.imported}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Skipped: {importResult.skipped}
                        </span>
                      </div>
                      {importResult.errors.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm font-medium text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            Errors ({importResult.errors.length}):
                          </div>
                          <ul className="max-h-32 overflow-y-auto text-xs text-destructive">
                            {importResult.errors.map((err, idx) => (
                              <li key={idx} className="py-0.5">
                                {err}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <DialogClose>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
                  <Button
                    onClick={handleImportMembers}
                    disabled={bulkImportMembers.isPending || !importCsvText.trim()}
                  >
                    {bulkImportMembers.isPending ? 'Importing...' : 'Import Members'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
              <DialogTrigger>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Unit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddUnit}>
                  <DialogHeader>
                    <DialogTitle>Add Unit</DialogTitle>
                    <DialogDescription>Add a new unit to the society</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unit-no">Unit Number</Label>
                        <Input
                          id="unit-no"
                          placeholder="e.g., A-301"
                          required
                          value={formUnitNumber}
                          onChange={(e) => setFormUnitNumber(e.target.value)}
                        />
                        <FormFieldError error={createUnit.error} field="unit_number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit-block">Block *</Label>
                        <Input
                          id="unit-block"
                          placeholder="e.g., A"
                          required
                          maxLength={50}
                          value={formBlock}
                          onChange={(e) =>
                            setFormBlock(e.target.value.toUpperCase())
                          }
                          onBlur={(e) =>
                            setFormBlock(e.target.value.trim().toUpperCase())
                          }
                        />
                        <FormFieldError error={createUnit.error} field="block" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unit-floor">Floor *</Label>
                        <Input
                          id="unit-floor"
                          type="number"
                          placeholder="0"
                          required
                          min={-5}
                          max={200}
                          step={1}
                          value={formFloor}
                          onChange={(e) => setFormFloor(e.target.value)}
                        />
                        <FormFieldError error={createUnit.error} field="floor" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit-area">Area (sq ft)</Label>
                        <Input
                          id="unit-area"
                          type="number"
                          placeholder="1200"
                          required
                          value={formArea}
                          onChange={(e) => setFormArea(e.target.value)}
                        />
                        <FormFieldError error={createUnit.error} field="area_sqft" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit-type">Type</Label>
                      <Select
                        id="unit-type"
                        required
                        value={formUnitType}
                        onChange={(e) => setFormUnitType(e.target.value)}
                      >
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="parking">Parking only</option>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createUnit.isPending}>
                      {createUnit.isPending ? 'Adding...' : 'Add Unit'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {/* Stats cards */}
      {statsQuery.isLoading ? (
        <StatsCardsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Units</CardTitle>
              <Home className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.total_units ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Occupied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{stats?.occupied_units ?? 0}</p>
              {stats && stats.total_units > 0 && (
                <p className="text-xs text-muted-foreground">
                  {Math.round((stats.occupied_units / stats.total_units) * 100)}% occupancy
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vacant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{stats?.vacant_units ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Units table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">All Units</CardTitle>
            <div className="flex gap-2">
              <Select
                className="w-32"
                value={blockFilter}
                onChange={(e) => {
                  setBlockFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Blocks</option>
                {blocks.map((b) => (
                  <option key={b} value={b}>Block {b}</option>
                ))}
              </Select>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search units..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (e.target.value === '') {
                      setSearchQuery('');
                      setPage(1);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit #</TableHead>
                <TableHead>Block</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Area (sqft)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Resident</TableHead>
                <TableHead>Occupied</TableHead>
                {/* QA #104 — visual cue for editable rows. The whole row
                    is also clickable but the pencil makes the affordance
                    discoverable. */}
                <TableHead className="w-12">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unitsQuery.isLoading ? (
                <TableSkeleton />
              ) : (
                units.map((unit) => (
                  <TableRow
                    key={unit.id}
                    className="cursor-pointer"
                    onClick={() => openDetailDialog(unit)}
                  >
                    <TableCell className="font-medium">{unit.unit_number}</TableCell>
                    <TableCell>{unit.block ?? '-'}</TableCell>
                    <TableCell>{unit.floor}</TableCell>
                    <TableCell>{unit.area_sqft.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getUnitTypeLabel(unit.unit_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      {unit.owner_name ? (
                        <div>
                          <div className="text-sm">{unit.owner_name}</div>
                          {unit.owner_phone && (
                            <div className="text-xs"><ClickablePhone phone={unit.owner_phone} /></div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No owner</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {unit.tenant_name ? (
                        <div>
                          <div className="text-sm">{unit.tenant_name}</div>
                          {unit.tenant_phone && (
                            <div className="text-xs"><ClickablePhone phone={unit.tenant_phone} /></div>
                          )}
                        </div>
                      ) : unit.owner_name ? (
                        <span className="text-sm text-muted-foreground">{unit.owner_name} (Self)</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {unit.is_occupied ? (
                        <Badge variant="success">Occupied</Badge>
                      ) : (
                        <Badge variant="secondary">Vacant</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* QA #104 — Pencil icon advertises "this row is
                          editable". Same handler as the row click so
                          users get the same dialog either way. */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Edit unit"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailDialog(unit);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!unitsQuery.isLoading && units.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Home className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No units found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalUnits} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Unit Detail Dialog (3 tabs)                                        */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) setDetailUnitId('');
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Unit {detail?.unit.unit_number ?? editUnitNumber}
              {detail?.unit.block ? ` — Block ${detail.unit.block}` : ''}
            </DialogTitle>
            <DialogDescription>
              View and manage unit details, members, and history
            </DialogDescription>
          </DialogHeader>

          {/* Tab bar */}
          <div className="flex border-b">
            {(['details', 'members', 'history'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50',
                )}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'details' && 'Details'}
                {tab === 'members' && 'Members'}
                {tab === 'history' && 'History'}
              </button>
            ))}
          </div>

          {/* Tab: Details */}
          {activeTab === 'details' && (
            <form onSubmit={handleEditUnit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-unit-no">Unit Number</Label>
                  <Input
                    id="edit-unit-no"
                    placeholder="e.g., A-301"
                    required
                    value={editUnitNumber}
                    onChange={(e) => setEditUnitNumber(e.target.value)}
                  />
                  <FormFieldError error={updateUnit.error} field="unit_number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unit-block">Block *</Label>
                  <Input
                    id="edit-unit-block"
                    placeholder="e.g., A"
                    required
                    maxLength={50}
                    value={editBlock}
                    onChange={(e) =>
                      setEditBlock(e.target.value.toUpperCase())
                    }
                    onBlur={(e) =>
                      setEditBlock(e.target.value.trim().toUpperCase())
                    }
                  />
                  <FormFieldError error={updateUnit.error} field="block" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-unit-floor">Floor *</Label>
                  <Input
                    id="edit-unit-floor"
                    type="number"
                    placeholder="0"
                    required
                    min={-5}
                    max={200}
                    step={1}
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                  />
                  <FormFieldError error={updateUnit.error} field="floor" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unit-area">Area (sq ft)</Label>
                  <Input
                    id="edit-unit-area"
                    type="number"
                    placeholder="1200"
                    required
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                  />
                  <FormFieldError error={updateUnit.error} field="area_sqft" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit-type">Type</Label>
                <Select
                  id="edit-unit-type"
                  required
                  value={editUnitType}
                  onChange={(e) => setEditUnitType(e.target.value)}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="parking">Parking only</option>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="edit-unit-active"
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                />
                <Label htmlFor="edit-unit-active">Active</Label>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={updateUnit.isPending}>
                  {updateUnit.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}

          {/* Tab: Members */}
          {activeTab === 'members' && (
            <div className="space-y-6 py-2">
              {unitDetailQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <>
                  {/* Owner Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Owner
                      </h4>
                      <div className="flex gap-1">
                        {owner && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTransferOpen(true)}
                            >
                              <ArrowRightLeft className="mr-1 h-3 w-3" />
                              Transfer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAddFamilyMember(owner.id, 'owner_family')}
                            >
                              <UserPlus className="mr-1 h-3 w-3" />
                              Add Family
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {owner ? (
                      <div className="space-y-2">
                        <MemberCard
                          member={owner}
                          unitId={detailUnitId}
                          onEdit={openEditMember}
                          onRemove={handleRemoveMember}
                          isRemoving={removeMember.isPending}
                        />
                        {ownerFamily.length > 0 && (
                          <div className="ml-4 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Family Members</p>
                            {ownerFamily.map((fm) => (
                              <MemberCard
                                key={fm.id}
                                member={fm}
                                unitId={detailUnitId}
                                onEdit={openEditMember}
                                onRemove={handleRemoveMember}
                                isRemoving={removeMember.isPending}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-2">
                        <p className="text-sm text-muted-foreground">No owner assigned</p>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setAddMemberParentId('');
                            setAddMemberType('owner');
                            setAddMemberName('');
                            setAddMemberPhone('');
                            setAddMemberMoveIn('');
                            setAddMemberSelected(null);
                            setAddMemberNoPhone(false);
                            setAddMemberOpen(true);
                          }}
                        >
                          <UserPlus className="mr-1 h-3 w-3" />
                          Assign Owner
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Tenant Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Tenant
                      </h4>
                      <div className="flex gap-1">
                        {tenant ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => setDisconnectOpen(true)}
                            >
                              <UserMinus className="mr-1 h-3 w-3" />
                              Disconnect
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAddFamilyMember(tenant.id, 'tenant_family')}
                            >
                              <UserPlus className="mr-1 h-3 w-3" />
                              Add Family
                            </Button>
                          </>
                        ) : (
                          <>
                            {/* QA #219 / #222 — primary action: full
                                onboarding with lease packet + approval
                                workflow. */}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={openOnboardTenant}
                            >
                              <UserPlus className="mr-1 h-3 w-3" />
                              Onboard Tenant
                            </Button>
                            {/* Legacy fallback: assign without a lease,
                                e.g. owner's relative recorded as
                                "tenant" administratively. No approval
                                request, no lease dates. */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={openAddTenant}
                              title="Assign without lease (no approval workflow)"
                            >
                              Quick assign
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {tenant ? (
                      <div className="space-y-2">
                        <MemberCard
                          member={tenant}
                          unitId={detailUnitId}
                          onEdit={openEditMember}
                          onRemove={handleRemoveMember}
                          isRemoving={removeMember.isPending}
                        />
                        {tenant.lease_end_date && (
                          <p className="ml-3 text-xs text-muted-foreground">
                            Lease ends: {formatDate(tenant.lease_end_date)}
                          </p>
                        )}
                        {tenantFamily.length > 0 && (
                          <div className="ml-4 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Family Members</p>
                            {tenantFamily.map((fm) => (
                              <MemberCard
                                key={fm.id}
                                member={fm}
                                unitId={detailUnitId}
                                onEdit={openEditMember}
                                onRemove={handleRemoveMember}
                                isRemoving={removeMember.isPending}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No tenant assigned</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab: History */}
          {activeTab === 'history' && (
            <div className="space-y-4 py-2">
              {unitDetailQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <>
                  {/* Past Members */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Past Members
                    </h4>
                    {detail?.past_members && detail.past_members.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Move In</TableHead>
                            <TableHead>Move Out</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.past_members.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">
                                {member.name ?? 'Unknown'}
                              </TableCell>
                              <TableCell>{getMemberTypeBadge(member.member_type)}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(member.move_in_date)}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {member.move_out_date ? formatDate(member.move_out_date) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No past members for this unit
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Occupancy Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Occupancy Timeline</h4>
                    {detail?.occupancy_timeline && detail.occupancy_timeline.length > 0 ? (
                      <div className="space-y-2">
                        {detail.occupancy_timeline.map((entry, index) => (
                          <div
                            key={`${entry.member_id}-${index}`}
                            className="flex items-center gap-3 rounded-md border p-3"
                          >
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {entry.name ?? 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getMemberTypeBadge(entry.member_type)}
                              </p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <p>{formatDate(entry.move_in_date)}</p>
                              <p>{entry.move_out_date ? formatDate(entry.move_out_date) : 'Present'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No timeline data available
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Edit Member Dialog                                                 */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={editMemberOpen} onOpenChange={setEditMemberOpen}>
        <DialogContent>
          <form onSubmit={handleEditMember}>
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>Update member details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-m-name">Name</Label>
                <Input
                  id="edit-m-name"
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-m-phone">Phone</Label>
                <Input
                  id="edit-m-phone"
                  value={editMemberPhone}
                  onChange={(e) => setEditMemberPhone(e.target.value)}
                  placeholder="10-digit mobile (optional +91 prefix)"
                  maxLength={13}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-m-email">Email</Label>
                <Input
                  id="edit-m-email"
                  type="email"
                  value={editMemberEmail}
                  onChange={(e) => setEditMemberEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={updateMemberDetail.isPending}>
                {updateMemberDetail.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Transfer Ownership Dialog                                          */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <form onSubmit={handleTransferOwnership}>
            <DialogHeader>
              <DialogTitle>Transfer Ownership</DialogTitle>
              <DialogDescription>
                The current owner will be moved out and a new owner assigned.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="transfer-name">New Owner Name</Label>
                <Input
                  id="transfer-name"
                  required
                  placeholder="Full name"
                  value={transferName}
                  onChange={(e) => setTransferName(e.target.value)}
                />
                <FormFieldError error={transferOwnership.error} field="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-phone">Phone</Label>
                <Input
                  id="transfer-phone"
                  required
                  placeholder="10-digit mobile (optional +91 prefix)"
                  maxLength={13}
                  value={transferPhone}
                  onChange={(e) => setTransferPhone(e.target.value)}
                />
                <FormFieldError error={transferOwnership.error} field="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-email">Email (optional)</Label>
                <Input
                  id="transfer-email"
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                />
                <FormFieldError error={transferOwnership.error} field="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-date">Move-in Date (optional)</Label>
                <Input
                  id="transfer-date"
                  type="date"
                  value={transferMoveIn}
                  onChange={(e) => setTransferMoveIn(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={transferOwnership.isPending}>
                {transferOwnership.isPending ? 'Transferring...' : 'Transfer Ownership'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Disconnect Tenant Confirmation Dialog                              */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Tenant</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect the current tenant
              {tenant?.name ? ` (${tenant.name})` : ''}? They will be marked as moved out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={disconnectTenant.isPending}
              onClick={handleDisconnectTenant}
            >
              {disconnectTenant.isPending ? 'Disconnecting...' : 'Disconnect Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Add Member Dialog (Family / Tenant)                                */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <form onSubmit={handleAddMember}>
            <DialogHeader>
              <DialogTitle>
                {addMemberType === 'owner'
                  ? 'Assign Owner'
                  : addMemberType === 'tenant'
                    ? 'Assign Tenant'
                    : 'Add Family Member'}
              </DialogTitle>
              <DialogDescription>
                {addMemberType === 'owner'
                  ? 'Assign an owner to this unit'
                  : addMemberType === 'tenant'
                    ? 'Assign a tenant to this unit'
                    : 'Add a family member'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Scan ID card with AI
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aadhaar / PAN / Passport / Voter / DL. Name auto-fills; other fields surface in a toast.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={ocrIdDoc.isPending}
                    onClick={() => idFileInputRef.current?.click()}
                  >
                    {ocrIdDoc.isPending ? 'Reading…' : 'Upload'}
                  </Button>
                  <input
                    ref={idFileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleScanIdDocument}
                  />
                </div>
                {idScanSummary && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Also extracted: <span className="font-mono">{idScanSummary}</span>
                  </p>
                )}
              </div>
              {/* Family-member-without-phone toggle (minor / elderly).
                  Hides the directory autocomplete so the operator can
                  enter just a name + parent_member_id link. */}
              {(addMemberType === 'owner_family' ||
                addMemberType === 'tenant_family') && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={addMemberNoPhone}
                    onChange={(e) => {
                      setAddMemberNoPhone(e.target.checked);
                      if (e.target.checked) {
                        // Drop any partial selection / typed phone so
                        // the form submits as no-phone cleanly.
                        setAddMemberSelected(null);
                        setAddMemberPhone('');
                      }
                    }}
                  />
                  No phone (e.g. minor / elderly)
                </label>
              )}

              {!addMemberNoPhone && (
                <div className="space-y-2">
                  <Label>Search directory by phone or name</Label>
                  <UserSearchSelect
                    scope="tenant"
                    value={addMemberSelected}
                    placeholder="Type at least 3 characters…"
                    onChange={(hit) => {
                      setAddMemberSelected(hit);
                      if (hit) {
                        setAddMemberPhone(hit.phone);
                        if (hit.name && !addMemberName) {
                          setAddMemberName(hit.name);
                        }
                      }
                    }}
                    onQueryChange={(q) => {
                      // Track the typed value so the form can fall
                      // back to it cleanly when the operator types a
                      // brand-new phone (silent no-match flow).
                      setAddMemberPhone(q);
                    }}
                  />
                  {addMemberSelected &&
                    addMemberSelected.units.some((u) => u.is_current) && (
                      <p className="text-xs text-amber-600">
                        Existing tenancy:{' '}
                        {addMemberSelected.units
                          .filter((u) => u.is_current)
                          .map((u) => `${u.unit_number} (${u.member_type})`)
                          .join(', ')}
                        . Continuing will add another membership row.
                      </p>
                    )}
                  <FormFieldError error={addMember.error} field="phone" />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="add-m-name">Name</Label>
                <Input
                  id="add-m-name"
                  required
                  placeholder="Full name"
                  value={addMemberName}
                  onChange={(e) => setAddMemberName(e.target.value)}
                />
                <FormFieldError error={addMember.error} field="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-m-movein">Move-in Date</Label>
                <Input
                  id="add-m-movein"
                  type="date"
                  required
                  value={addMemberMoveIn}
                  onChange={(e) => setAddMemberMoveIn(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={addMember.isPending}>
                {addMember.isPending
                  ? 'Adding...'
                  : addMemberType === 'owner'
                    ? 'Assign Owner'
                    : addMemberType === 'tenant'
                      ? 'Assign Tenant'
                      : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QA #219 / #222 — Onboard Tenant dialog. Captures the lease
          packet and POSTs to /tenant-lifecycle/onboard which creates a
          tenant_onboarding row + approval request. The members row is
          written when the approval is granted; until then the tenant
          shows up under /approvals as a pending item. */}
      <Dialog open={onboardTenantOpen} onOpenChange={setOnboardTenantOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleOnboardTenantSubmit}>
            <DialogHeader>
              <DialogTitle>Onboard Tenant</DialogTitle>
              <DialogDescription>
                Submit a tenant onboarding request with the full lease
                packet. The tenant becomes active once a community
                admin or committee member approves.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="onboard-name">
                  Tenant name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="onboard-name"
                  required
                  placeholder="Full name"
                  value={onboardName}
                  onChange={(e) => setOnboardName(e.target.value)}
                />
                <FormFieldError error={createOnboarding.error} field="tenant_name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboard-phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="onboard-phone"
                  required
                  placeholder="10-digit mobile (optional +91)"
                  maxLength={13}
                  inputMode="tel"
                  value={onboardPhone}
                  onChange={(e) => setOnboardPhone(e.target.value)}
                />
                <FormFieldError error={createOnboarding.error} field="tenant_phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboard-email">Email</Label>
                <Input
                  id="onboard-email"
                  type="email"
                  placeholder="optional"
                  value={onboardEmail}
                  onChange={(e) => setOnboardEmail(e.target.value)}
                />
                <FormFieldError error={createOnboarding.error} field="tenant_email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboard-lease-start">
                  Lease start <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="onboard-lease-start"
                  type="date"
                  required
                  value={onboardLeaseStart}
                  onChange={(e) => setOnboardLeaseStart(e.target.value)}
                />
                <FormFieldError error={createOnboarding.error} field="lease_start_date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboard-lease-end">
                  Lease end <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="onboard-lease-end"
                  type="date"
                  required
                  value={onboardLeaseEnd}
                  onChange={(e) => setOnboardLeaseEnd(e.target.value)}
                />
                <FormFieldError error={createOnboarding.error} field="lease_end_date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboard-rent">Monthly rent (₹)</Label>
                <Input
                  id="onboard-rent"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="optional"
                  value={onboardMonthlyRent}
                  onChange={(e) => setOnboardMonthlyRent(e.target.value)}
                />
                <FormFieldError error={createOnboarding.error} field="monthly_rent" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboard-deposit">Security deposit (₹)</Label>
                <Input
                  id="onboard-deposit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="optional"
                  value={onboardSecurityDeposit}
                  onChange={(e) => setOnboardSecurityDeposit(e.target.value)}
                />
                <FormFieldError error={createOnboarding.error} field="security_deposit" />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                The Aadhaar / lease document upload step is on the
                Approvals page after the request is created.
              </p>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createOnboarding.isPending}>
                {createOnboarding.isPending ? 'Submitting...' : 'Submit Onboarding'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
