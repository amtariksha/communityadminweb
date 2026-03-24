'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Home, Upload, FileSpreadsheet, Search, ChevronLeft, ChevronRight, UserPlus, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
// Textarea removed — CSV import is now on /units/import page
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
import { useToast } from '@/components/ui/toast';
import {
  useUnits,
  useUnitStats,
  useBlocks,
  useUnitMembers,
  useCreateUnit,
  useUpdateUnit,
  useAddMember,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

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
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-5" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function UnitsContent(): ReactNode {
  const router = useRouter();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [blockFilter, setBlockFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [detailUnitId, setDetailUnitId] = useState('');

  // Create unit form
  const [formUnitNumber, setFormUnitNumber] = useState('');
  const [formBlock, setFormBlock] = useState('');
  const [formFloor, setFormFloor] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formUnitType, setFormUnitType] = useState('flat');

  // Edit unit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUnitId, setEditUnitId] = useState('');
  const [editUnitNumber, setEditUnitNumber] = useState('');
  const [editBlock, setEditBlock] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editUnitType, setEditUnitType] = useState('flat');
  const [editIsActive, setEditIsActive] = useState(true);

  // Add member form
  const [memberUserId, setMemberUserId] = useState('');
  const [memberType, setMemberType] = useState('owner');
  const [memberMoveIn, setMemberMoveIn] = useState('');

  const blocksQuery = useBlocks();
  const blocks = blocksQuery.data ?? [];

  const unitsQuery = useUnits({
    search: searchQuery || undefined,
    block: blockFilter || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const statsQuery = useUnitStats();
  const membersQuery = useUnitMembers(detailUnitId);
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const addMember = useAddMember();

  const units = unitsQuery.data?.data ?? [];
  const totalUnits = unitsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUnits / ITEMS_PER_PAGE));

  const stats = statsQuery.data;
  const members = membersQuery.data ?? [];

  function handleSearch(): void {
    setSearchQuery(searchInput);
    setPage(1);
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

  function handleAddMember(e: FormEvent): void {
    e.preventDefault();
    addMember.mutate(
      {
        unit_id: detailUnitId,
        user_id: memberUserId,
        member_type: memberType,
        move_in_date: memberMoveIn,
      },
      {
        onSuccess() {
          setMemberDialogOpen(false);
          setMemberUserId('');
          setMemberType('owner');
          setMemberMoveIn('');
          addToast({ title: 'Member added successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to add member', variant: 'destructive' });
        },
      },
    );
  }

  function handleRowClick(unitId: string): void {
    setDetailUnitId(unitId);
  }

  function openEditDialog(unit: { id: string; unit_number: string; block?: string | null; floor: number; area_sqft: number; unit_type: string; is_active: boolean }): void {
    setEditUnitId(unit.id);
    setEditUnitNumber(unit.unit_number);
    setEditBlock(unit.block ?? '');
    setEditFloor(String(unit.floor));
    setEditArea(String(unit.area_sqft));
    setEditUnitType(unit.unit_type);
    setEditIsActive(unit.is_active);
    setEditDialogOpen(true);
  }

  function handleEditUnit(e: FormEvent): void {
    e.preventDefault();
    updateUnit.mutate(
      {
        id: editUnitId,
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
          setEditDialogOpen(false);
          addToast({ title: 'Unit updated successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to update unit', variant: 'destructive' });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Units' }]}
        title="Units"
        description="Manage flats, shops, and parking spaces"
        actions={
          <>
            <Button variant="outline" onClick={() => router.push('/units/import')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import from App
            </Button>

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
                <TableHead>Occupied</TableHead>
                <TableHead className="w-10"></TableHead>
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
                    onClick={() => handleRowClick(unit.id)}
                  >
                    <TableCell className="font-medium">{unit.unit_number}</TableCell>
                    <TableCell>{unit.block ?? '-'}</TableCell>
                    <TableCell>{unit.floor}</TableCell>
                    <TableCell>{unit.area_sqft.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getUnitTypeLabel(unit.unit_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      {unit.is_occupied ? (
                        <Badge variant="success">Occupied</Badge>
                      ) : (
                        <Badge variant="secondary">Vacant</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(unit);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
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

      {detailUnitId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Members of Unit {units.find((u) => u.id === detailUnitId)?.unit_number ?? ''}
              </CardTitle>
              <div className="flex gap-2">
                <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                  <DialogTrigger>
                    <Button size="sm">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleAddMember}>
                      <DialogHeader>
                        <DialogTitle>Add Member</DialogTitle>
                        <DialogDescription>
                          Add a member to unit {units.find((u) => u.id === detailUnitId)?.unit_number ?? ''}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="member-user-id">User ID</Label>
                          <Input
                            id="member-user-id"
                            placeholder="User ID"
                            required
                            value={memberUserId}
                            onChange={(e) => setMemberUserId(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="member-type">Member Type</Label>
                          <Select
                            id="member-type"
                            required
                            value={memberType}
                            onChange={(e) => setMemberType(e.target.value)}
                          >
                            <option value="owner">Owner</option>
                            <option value="tenant">Tenant</option>
                            <option value="family_member">Family Member</option>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="member-move-in">Move-in Date</Label>
                          <Input
                            id="member-move-in"
                            type="date"
                            required
                            value={memberMoveIn}
                            onChange={(e) => setMemberMoveIn(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={addMember.isPending}>
                          {addMember.isPending ? 'Adding...' : 'Add Member'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" onClick={() => setDetailUnitId('')}>
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {membersQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : members.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No members assigned to this unit yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Move-in Date</TableHead>
                    <TableHead>Primary Contact</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-mono text-xs">{member.user_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.member_type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(member.move_in_date)}
                      </TableCell>
                      <TableCell>
                        {member.is_primary_contact ? (
                          <Badge variant="success">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Unit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditUnit}>
            <DialogHeader>
              <DialogTitle>Edit Unit</DialogTitle>
              <DialogDescription>Update unit details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={updateUnit.isPending}>
                {updateUnit.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
