'use client';

import { useState, useCallback, type FormEvent, type ReactNode } from 'react';
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
} from '@/hooks';
import type { UnitDetailMember } from '@/hooks';
import { cn, formatDate } from '@/lib/utils';
import { ClickablePhone, ClickableEmail } from '@/components/ui/clickable-contact';

const ITEMS_PER_PAGE = 20;

function getUnitTypeLabel(type: string): string {
  switch (type) {
    case 'flat':
      return 'Flat';
    case 'shop':
      return 'Shop';
    case 'office':
      return 'Office';
    case 'parking':
      return 'Parking';
    case 'other':
      return 'Other';
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
  const [formUnitType, setFormUnitType] = useState('flat');

  // Unit detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailUnitId, setDetailUnitId] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'members' | 'history'>('members');

  // Edit unit form (Details tab)
  const [editUnitNumber, setEditUnitNumber] = useState('');
  const [editBlock, setEditBlock] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editUnitType, setEditUnitType] = useState('flat');
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
        onError() {
          addToast({ title: 'Import failed', variant: 'destructive' });
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
    createUnit.mutate(
      {
        unit_number: formUnitNumber,
        block: formBlock || null,
        floor: Number(formFloor),
        area_sqft: Number(formArea),
        unit_type: formUnitType,
      },
      {
        onSuccess() {
          setUnitDialogOpen(false);
          resetUnitForm();
          addToast({ title: 'Unit added successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to add unit', variant: 'destructive' });
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
    updateUnit.mutate(
      {
        id: detailUnitId,
        data: {
          unit_number: editUnitNumber,
          block: editBlock || null,
          floor: Number(editFloor),
          area_sqft: Number(editArea),
          unit_type: editUnitType,
          is_active: editIsActive,
        },
      },
      {
        onSuccess() {
          addToast({ title: 'Unit updated successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to update unit', variant: 'destructive' });
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
    updateMemberDetail.mutate(
      {
        unitId: detailUnitId,
        memberId: editMemberId,
        name: editMemberName || undefined,
        phone: editMemberPhone || undefined,
        email: editMemberEmail || null,
      },
      {
        onSuccess() {
          setEditMemberOpen(false);
          addToast({ title: 'Member updated', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to update member', description: error.message, variant: 'destructive' });
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
          addToast({ title: 'Failed to remove member', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function handleTransferOwnership(e: FormEvent): void {
    e.preventDefault();
    transferOwnership.mutate(
      {
        unitId: detailUnitId,
        name: transferName,
        phone: transferPhone,
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
          addToast({ title: 'Transfer failed', description: error.message, variant: 'destructive' });
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
          addToast({ title: 'Failed to disconnect tenant', description: error.message, variant: 'destructive' });
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
    setAddMemberOpen(true);
  }

  function openAddTenant(): void {
    setAddMemberParentId('');
    setAddMemberType('tenant');
    setAddMemberName('');
    setAddMemberPhone('');
    setAddMemberMoveIn('');
    setAddMemberOpen(true);
  }

  function handleAddMember(e: FormEvent): void {
    e.preventDefault();
    addMember.mutate(
      {
        unit_id: detailUnitId,
        name: addMemberName,
        phone: addMemberPhone,
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
          addToast({ title: 'Failed to add member', description: error.message, variant: 'destructive' });
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
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit-block">Block</Label>
                        <Input
                          id="unit-block"
                          placeholder="e.g., A"
                          value={formBlock}
                          onChange={(e) => setFormBlock(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unit-floor">Floor</Label>
                        <Input
                          id="unit-floor"
                          type="number"
                          placeholder="0"
                          required
                          value={formFloor}
                          onChange={(e) => setFormFloor(e.target.value)}
                        />
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
                        <option value="flat">Flat</option>
                        <option value="shop">Shop</option>
                        <option value="office">Office</option>
                        <option value="parking">Parking</option>
                        <option value="other">Other</option>
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
                      {(unit as Record<string, unknown>).owner_name ? (
                        <div>
                          <div className="text-sm">{String((unit as Record<string, unknown>).owner_name)}</div>
                          {(unit as Record<string, unknown>).owner_phone && (
                            <div className="text-xs"><ClickablePhone phone={String((unit as Record<string, unknown>).owner_phone)} /></div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No owner</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(unit as Record<string, unknown>).tenant_name ? (
                        <div>
                          <div className="text-sm">{String((unit as Record<string, unknown>).tenant_name)}</div>
                          {(unit as Record<string, unknown>).tenant_phone && (
                            <div className="text-xs"><ClickablePhone phone={String((unit as Record<string, unknown>).tenant_phone)} /></div>
                          )}
                        </div>
                      ) : (unit as Record<string, unknown>).owner_name ? (
                        <span className="text-sm text-muted-foreground">{String((unit as Record<string, unknown>).owner_name)} (Self)</span>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unit-block">Block</Label>
                  <Input
                    id="edit-unit-block"
                    placeholder="e.g., A"
                    value={editBlock}
                    onChange={(e) => setEditBlock(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-unit-floor">Floor</Label>
                  <Input
                    id="edit-unit-floor"
                    type="number"
                    placeholder="0"
                    required
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                  />
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
                  <option value="flat">Flat</option>
                  <option value="shop">Shop</option>
                  <option value="office">Office</option>
                  <option value="parking">Parking</option>
                  <option value="other">Other</option>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openAddTenant}
                          >
                            <UserPlus className="mr-1 h-3 w-3" />
                            Assign Tenant
                          </Button>
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
                  maxLength={10}
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-phone">Phone</Label>
                <Input
                  id="transfer-phone"
                  required
                  placeholder="10-digit mobile"
                  maxLength={10}
                  value={transferPhone}
                  onChange={(e) => setTransferPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-email">Email (optional)</Label>
                <Input
                  id="transfer-email"
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                />
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
              <div className="space-y-2">
                <Label htmlFor="add-m-name">Name</Label>
                <Input
                  id="add-m-name"
                  required
                  placeholder="Full name"
                  value={addMemberName}
                  onChange={(e) => setAddMemberName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-m-phone">Phone</Label>
                <Input
                  id="add-m-phone"
                  required
                  placeholder="10-digit mobile"
                  maxLength={10}
                  value={addMemberPhone}
                  onChange={(e) => setAddMemberPhone(e.target.value)}
                />
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
    </div>
  );
}
