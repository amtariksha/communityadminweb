'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  Pencil,
  Wrench,
  AlertTriangle,
  Clock,
  Package,
  ClipboardCheck,
  Calendar,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { friendlyError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';
import {
  useAssetDashboard,
  useAMCs,
  useServiceLogs,
  useCreateAMC,
  useLogService,
  useAssetChecklists,
  useCreateChecklist,
  useAuditSchedules,
  useCreateAuditSchedule,
  useConductedAudits,
  useRecordConductedAudit,
  useVendorAudits,
  useCreateVendorAudit,
} from '@/hooks/use-assets';
import type {
  Asset,
  AMCContract,
  ServiceLog,
  AssetChecklist,
  AuditSchedule,
  ConductedAudit,
  VendorAudit,
} from '@/hooks/use-assets';
import { useVendors } from '@/hooks';
import { UserSearchSelect } from '@/components/ui/user-search-select';
import type { UserSearchHit } from '@/hooks/use-user-search';
import { AmcEditDialog } from './amc-edit-dialog';
import { AssetForm } from './asset-form';
import { AssetQrDialog } from './asset-qr-dialog';
import { AssetSearchSelect, type AssetChoice } from './asset-search-select';
import { AssetListTab } from './asset-list-tab';
import { ASSET_TYPES, CHECKLIST_FREQUENCY_OPTIONS, CONDITIONS, formatDate } from './asset-ui';
import { ChecklistsTable } from './checklists-table';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------



// QA #342 — values must match the backend enum + DB CHECK exactly.
// Backend: apps/api/src/modules/asset/asset.controller.ts (Zod) +
// packages/db/src/migrations/070_asset_service_logs_emergency.sql
// (CHECK constraint). The previous list (preventive / corrective /
// calibration) wasn't accepted by the backend at all — the default
// 'preventive' value made every Save click 400.
const SERVICE_TYPES = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysRemaining(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  className?: string;
}

function StatCard({ title, value, icon, className }: StatCardProps): ReactNode {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${className ?? 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AssetsContent(): ReactNode {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'assets' | 'amc' | 'services' | 'checklists' | 'schedules' | 'audits' | 'vendor_audits'>('assets');

  // QR Modal
  const [qrModalAsset, setQrModalAsset] = useState<Asset | null>(null);

  // Asset dialog (the shared form, SB-07)
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // AMC dialog
  const [amcDialogOpen, setAmcDialogOpen] = useState(false);
  const [amcAsset, setAmcAsset] = useState<AssetChoice | null>(null);
  const [amcVendorId, setAmcVendorId] = useState('');
  const [amcContractNumber, setAmcContractNumber] = useState('');
  const [amcStartDate, setAmcStartDate] = useState('');
  const [amcEndDate, setAmcEndDate] = useState('');
  const [amcAmount, setAmcAmount] = useState('');

  // Service dialog
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceAsset, setServiceAsset] = useState<AssetChoice | null>(null);
  const [serviceType, setServiceType] = useState('maintenance');
  const [serviceDate, setServiceDate] = useState('');
  const [serviceVendor, setServiceVendor] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  const [serviceNextDue, setServiceNextDue] = useState('');

  // Checklists dialog & queries
  const { data: checklists = [], isLoading: checklistsLoading } = useAssetChecklists();
  const createChecklist = useCreateChecklist();
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [clName, setClName] = useState('');
  const [clArea, setClArea] = useState('');
  const [clItems, setClItems] = useState('5');
  const [clFreq, setClFreq] = useState('monthly');

  // Audit Schedules dialog & queries
  const { data: schedules = [], isLoading: schedulesLoading } = useAuditSchedules();
  const createSchedule = useCreateAuditSchedule();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [schedChecklistId, setSchedChecklistId] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedAssignee, setSchedAssignee] = useState<UserSearchHit | null>(null);

  // Conducted Audits dialog & queries
  const { data: conductedAudits = [], isLoading: conductedLoading } = useConductedAudits();
  const recordConductedAudit = useRecordConductedAudit();
  const [conductDialogOpen, setConductDialogOpen] = useState(false);
  const [conductChecklist, setConductChecklist] = useState('');
  const [conductBy, setConductBy] = useState('');
  const [conductScore, setConductScore] = useState('100');
  const [conductPassed, setConductPassed] = useState('10');
  const [conductFailed, setConductFailed] = useState('0');
  const [conductStatus, setConductStatus] = useState<'pass' | 'fail' | 'conditional'>('pass');
  const [conductNotes, setConductNotes] = useState('');

  // Vendor Audits dialog & queries
  const { data: vendorAudits = [], isLoading: vendorAuditsLoading } = useVendorAudits();
  const createVendorAudit = useCreateVendorAudit();
  const [vendorAuditDialogOpen, setVendorAuditDialogOpen] = useState(false);
  const [vaVendorId, setVaVendorId] = useState('');
  const [vaAuditor, setVaAuditor] = useState('');
  const [vaDate, setVaDate] = useState('');
  const [vaRating, setVaRating] = useState('5');
  const [vaNotes, setVaNotes] = useState('');

  // Queries
  const { data: dashboard, isLoading: dashLoading } = useAssetDashboard();
  // The AMC and service-log pickers search the server (AssetSearchSelect);
  // the Assets tab pages through every asset itself (ASSET-02).
  const [editingAmc, setEditingAmc] = useState<AMCContract | null>(null);
  const { data: amcsData, isLoading: amcsLoading } = useAMCs();
  const { data: vendorsResponse } = useVendors();
  const vendors = (vendorsResponse as unknown as { data: Array<{ id: string; name: string }> })?.data ?? [];

  // For service logs, show all when no specific asset is selected
  const [serviceFilterAssetId, setServiceFilterAssetId] = useState('');
  const { data: serviceLogs, isLoading: servicesLoading } = useServiceLogs(serviceFilterAssetId);

  const amcs = amcsData?.data ?? [];
  const services = (serviceLogs as ServiceLog[] | undefined) ?? [];

  // Mutations
  const createAMC = useCreateAMC();
  const logService = useLogService();

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  function openEditAsset(asset: Asset): void {
    setEditingAsset(asset);
    setAssetDialogOpen(true);
  }

  function openAddAsset(): void {
    setEditingAsset(null);
    setAssetDialogOpen(true);
  }

  function resetAmcForm(): void {
    setAmcAsset(null);
    setAmcVendorId('');
    setAmcContractNumber('');
    setAmcStartDate('');
    setAmcEndDate('');
    setAmcAmount('');
  }

  function handleAmcSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!amcAsset) {
      addToast({ title: 'Select an asset', variant: 'destructive' });
      return;
    }
    // amc_contracts keeps the vendor by name, not by id.
    const vendor = vendors.find((v) => v.id === amcVendorId);
    if (!vendor) {
      addToast({ title: 'Select a vendor', variant: 'destructive' });
      return;
    }
    createAMC.mutate(
      {
        asset_id: amcAsset.id,
        vendor_name: vendor.name,
        contract_number: amcContractNumber,
        start_date: amcStartDate,
        end_date: amcEndDate,
        cost: Number(amcAmount),
      },
      {
        onSuccess() {
          addToast({ title: 'AMC contract created', variant: 'success' });
          setAmcDialogOpen(false);
          resetAmcForm();
        },
        onError(err) {
          addToast({ title: 'Failed to create AMC', description: friendlyError(err), variant: 'destructive' });
        },
      },
    );
  }

  function resetServiceForm(): void {
    setServiceAsset(null);
    setServiceType('maintenance');
    setServiceDate('');
    setServiceVendor('');
    setServiceDescription('');
    setServiceCost('');
    setServiceNextDue('');
  }

  function handleServiceSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!serviceAsset) {
      addToast({ title: 'Select an asset', variant: 'destructive' });
      return;
    }
    logService.mutate(
      {
        asset_id: serviceAsset.id,
        service_type: serviceType,
        service_date: serviceDate,
        vendor_name: serviceVendor || undefined,
        description: serviceDescription,
        cost: serviceCost ? Number(serviceCost) : undefined,
        next_service_date: serviceNextDue || undefined,
      },
      {
        onSuccess() {
          addToast({ title: 'Service logged', variant: 'success' });
          setServiceDialogOpen(false);
          resetServiceForm();
        },
        onError(err) {
          addToast({ title: 'Failed to log service', description: friendlyError(err), variant: 'destructive' });
        },
      },
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Assets' }]}
        title="Asset Management"
        description="Track assets, AMC contracts, and service history"
      />

      {/* Dashboard cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              title="Total Assets"
              value={dashboard?.total_assets ?? 0}
              icon={<Package className="h-6 w-6" />}
            />
            <StatCard
              title="Active AMCs"
              value={dashboard?.active_amcs ?? 0}
              icon={<Wrench className="h-6 w-6" />}
            />
            <StatCard
              title="Expiring Soon"
              value={dashboard?.expiring_amcs_30d ?? 0}
              icon={<Clock className="h-6 w-6" />}
              className="bg-warning/10 text-warning"
            />
            <StatCard
              title="Overdue Services"
              value={dashboard?.overdue_services ?? 0}
              icon={<AlertTriangle className="h-6 w-6" />}
              className="bg-destructive/10 text-destructive"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {[
          { key: 'assets', label: 'Assets' },
          { key: 'amc', label: 'AMC Contracts' },
          { key: 'services', label: 'Service History' },
          { key: 'checklists', label: 'Master Checklists' },
          { key: 'schedules', label: 'Audit Schedules' },
          { key: 'audits', label: 'Conducted Audits' },
          { key: 'vendor_audits', label: 'Vendor Audits' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === key
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(key as typeof activeTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Assets tab */}
      {activeTab === 'assets' && (
        <AssetListTab
          onEdit={openEditAsset}
          onQr={setQrModalAsset}
          addAsset={
            <Button size="sm" onClick={openAddAsset}>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          }
        />
      )}

      {/* AMC tab */}
      {activeTab === 'amc' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>AMC Contracts</CardTitle>
            <Dialog open={amcDialogOpen} onOpenChange={(open) => { setAmcDialogOpen(open); if (!open) resetAmcForm(); }}>
              <DialogTrigger>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add AMC
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAmcSubmit}>
                  <DialogHeader>
                    <DialogTitle>Create AMC Contract</DialogTitle>
                    <DialogDescription>Link an AMC contract to an asset and vendor</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amc-asset">Asset *</Label>
                      <AssetSearchSelect id="amc-asset" value={amcAsset} onChange={setAmcAsset} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amc-vendor">Vendor *</Label>
                      <Select id="amc-vendor" value={amcVendorId} onChange={(e) => setAmcVendorId(e.target.value)} required>
                        <option value="">Select vendor</option>
                        {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amc-contract">Contract Number *</Label>
                      <Input id="amc-contract" value={amcContractNumber} onChange={(e) => setAmcContractNumber(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amc-start">Start Date *</Label>
                        <Input id="amc-start" type="date" value={amcStartDate} onChange={(e) => setAmcStartDate(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amc-end">End Date *</Label>
                        <Input id="amc-end" type="date" value={amcEndDate} onChange={(e) => setAmcEndDate(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amc-amount">Amount *</Label>
                      <Input id="amc-amount" type="number" min="0" step="0.01" value={amcAmount} onChange={(e) => setAmcAmount(e.target.value)} required />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createAMC.isPending}>Create</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {amcsLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : amcs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Wrench className="mb-2 h-10 w-10" />
                <p className="text-lg font-medium">No AMC contracts</p>
                <p className="text-sm">Add an AMC contract to track maintenance agreements</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Contract #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Days Remaining</TableHead>
                    <TableHead>Reminder</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amcs.map((amc) => {
                    const days = daysRemaining(amc.end_date);
                    return (
                      <TableRow key={amc.id}>
                        <TableCell className="font-medium">{amc.asset_name}</TableCell>
                        <TableCell>{amc.vendor_name}</TableCell>
                        <TableCell className="font-mono text-xs">{amc.contract_number}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(amc.start_date)} - {formatDate(amc.end_date)}
                        </TableCell>
                        <TableCell>{formatCurrency(amc.cost)}</TableCell>
                        <TableCell>
                          <span className={days < 30 ? 'font-semibold text-destructive' : ''}>
                            {days > 0 ? `${days} days` : 'Expired'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{amc.reminder_days ?? 30} days before</TableCell>
                        <TableCell>
                          <Badge variant={amc.status === 'active' ? 'success' : 'secondary'}>
                            {amc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="rounded p-1 hover:bg-muted"
                            onClick={() => setEditingAmc(amc)}
                            title="Edit contract"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service History tab */}
      {activeTab === 'services' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Service History</CardTitle>
            <Dialog open={serviceDialogOpen} onOpenChange={(open) => { setServiceDialogOpen(open); if (!open) resetServiceForm(); }}>
              <DialogTrigger>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Log Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleServiceSubmit}>
                  <DialogHeader>
                    <DialogTitle>Log Service</DialogTitle>
                    <DialogDescription>Record a service or maintenance activity</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="service-asset">Asset *</Label>
                      <AssetSearchSelect id="service-asset" value={serviceAsset} onChange={setServiceAsset} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="service-type">Service Type *</Label>
                        <Select id="service-type" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                          {SERVICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service-date">Service Date *</Label>
                        <Input id="service-date" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service-vendor">Vendor</Label>
                      <Input id="service-vendor" value={serviceVendor} onChange={(e) => setServiceVendor(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service-desc">Description *</Label>
                      <Input id="service-desc" value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="service-cost">Cost</Label>
                        <Input id="service-cost" type="number" value={serviceCost} onChange={(e) => setServiceCost(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service-next">Next Service Due</Label>
                        <Input id="service-next" type="date" value={serviceNextDue} onChange={(e) => setServiceNextDue(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={logService.isPending}>Log Service</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {servicesLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : services.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Clock className="mb-2 h-10 w-10" />
                <p className="text-lg font-medium">No service records</p>
                <p className="text-sm">Log a service to start tracking maintenance history</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Next Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((svc) => (
                    <TableRow key={svc.id}>
                      <TableCell className="font-medium">{svc.asset_name}</TableCell>
                      <TableCell>
                        {/* QA #342 — variant map mirrors the canonical
                            backend enum. 'emergency' / 'repair' are urgent
                            (destructive); 'maintenance' / 'inspection' /
                            'cleaning' are routine (success); the rest
                            fall through to default. */}
                        <Badge
                          variant={
                            svc.service_type === 'emergency' ||
                            svc.service_type === 'repair'
                              ? 'destructive'
                              : svc.service_type === 'maintenance' ||
                                  svc.service_type === 'inspection' ||
                                  svc.service_type === 'cleaning'
                                ? 'success'
                                : 'default'
                          }
                        >
                          {svc.service_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(svc.service_date)}</TableCell>
                      <TableCell>{svc.vendor_name || '-'}</TableCell>
                      <TableCell>{svc.cost ? formatCurrency(svc.cost) : '-'}</TableCell>
                      <TableCell>{formatDate(svc.next_service_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Master Checklists tab */}
      {activeTab === 'checklists' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Master Audit Checklists</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Predefined inspection templates for routine asset and site maintenance</p>
            </div>
            <Button size="sm" onClick={() => setChecklistDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Checklist
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {checklistsLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : checklists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ClipboardCheck className="mb-2 h-10 w-10 opacity-50" />
                <p className="text-lg font-medium">No checklists defined</p>
                <p className="text-sm">Create standard inspection checklists for DG sets, elevators, pumps, etc.</p>
              </div>
            ) : (
              <ChecklistsTable checklists={checklists} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit Schedules tab */}
      {activeTab === 'schedules' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Scheduled Asset Audits</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Upcoming inspection rounds assigned to facilities staff</p>
            </div>
            <Button size="sm" onClick={() => setScheduleDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Audit
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {schedulesLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Calendar className="mb-2 h-10 w-10 opacity-50" />
                <p className="text-lg font-medium">No audit rounds scheduled</p>
                <p className="text-sm">Plan an inspection round and assign it to a technician</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Checklist</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Assigned Auditor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.checklist}</TableCell>
                      <TableCell>{formatDate(s.scheduled_date)}</TableCell>
                      <TableCell>{s.assignee_name || s.assigned_to || 'Assigned Staff'}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'completed' ? 'success' : s.status === 'overdue' ? 'destructive' : 'warning'}>
                          {s.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conducted Audits tab */}
      {activeTab === 'audits' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Conducted Audit Logs</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Inspection records with compliance pass/fail scores</p>
            </div>
            <Button size="sm" onClick={() => setConductDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record Audit
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {conductedLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : conductedAudits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShieldCheck className="mb-2 h-10 w-10 opacity-50" />
                <p className="text-lg font-medium">No conducted audit logs</p>
                <p className="text-sm">Record completed inspection checklists and audit findings</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Checklist</TableHead>
                    <TableHead>Conducted Date</TableHead>
                    <TableHead>Conducted By</TableHead>
                    <TableHead>Compliance Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conductedAudits.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.checklist}</TableCell>
                      <TableCell>{formatDate(a.conducted_on)}</TableCell>
                      <TableCell>{a.conducted_by}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{a.score}%</span>{' '}
                        <span className="text-xs text-muted-foreground">({a.passed} passed / {a.failed} failed)</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.status === 'pass' ? 'success' : a.status === 'conditional' ? 'warning' : 'destructive'}>
                          {a.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{a.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vendor Audits tab */}
      {activeTab === 'vendor_audits' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Vendor Performance Audits</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">SLA and service delivery compliance audits of empanelled contractors</p>
            </div>
            <Button size="sm" onClick={() => setVendorAuditDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Vendor Audit
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {vendorAuditsLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : vendorAudits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Wrench className="mb-2 h-10 w-10 opacity-50" />
                <p className="text-lg font-medium">No vendor audits found</p>
                <p className="text-sm">Audit facility contractors against SLA criteria and quality standards</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Auditor</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Compliance Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorAudits.map((va) => (
                    <TableRow key={va.id}>
                      <TableCell className="font-medium">{va.vendor_name || 'Vendor'}</TableCell>
                      <TableCell>{va.auditor_name}</TableCell>
                      <TableCell>{formatDate(va.scheduled_date)}</TableCell>
                      <TableCell>
                        {va.compliance_rating != null ? (
                          <Badge variant="outline">{va.compliance_rating} / 5 ★</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={va.status === 'completed' ? 'success' : 'warning'}>{va.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{va.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ROOT-LEVEL DIALOG: Schedule Audit Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule Inspection Audit
            </DialogTitle>
            <DialogDescription>
              Assign a checklist inspection round to a facilities team member.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const selectedCl = checklists.find((c) => c.id === schedChecklistId);
              if (!schedAssignee) {
                addToast({
                  title: 'Choose who will run the audit',
                  description: 'Search by name or phone and pick a person from the list.',
                  variant: 'destructive',
                });
                return;
              }
              try {
                await createSchedule.mutateAsync({
                  checklist_id: schedChecklistId || undefined,
                  checklist: selectedCl?.name || 'General Equipment Audit',
                  scheduled_date: schedDate,
                  // Name snapshot for the list; the column holds 100 chars.
                  assigned_to: (schedAssignee.name ?? schedAssignee.phone).slice(0, 100),
                  // FK to users(id) — a society_staff id is not valid here.
                  assigned_to_user_id: schedAssignee.id,
                });
                addToast({ title: 'Scheduled', description: 'Audit round successfully scheduled' });
                setScheduleDialogOpen(false);
                setSchedChecklistId('');
                setSchedDate('');
                setSchedAssignee(null);
              } catch (err) {
                addToast({ title: 'Error', description: friendlyError(err), variant: 'destructive' });
              }
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="sched-checklist">Checklist *</Label>
              <Select
                id="sched-checklist"
                value={schedChecklistId}
                onChange={(e) => setSchedChecklistId(e.target.value)}
                required
              >
                <option value="">Select master checklist...</option>
                {checklists.map((cl) => (
                  <option key={cl.id} value={cl.id}>{cl.name} ({cl.area})</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched-date">Scheduled Date *</Label>
              <Input
                id="sched-date"
                type="date"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Assign To *</Label>
              <UserSearchSelect
                scope="tenant"
                value={schedAssignee}
                onChange={setSchedAssignee}
                retainTypedOnNoMatch={false}
                noMatchHint="No one in this society matches. Staff need a login to be assigned."
              />
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createSchedule.isPending}>
                {createSchedule.isPending ? 'Scheduling...' : 'Schedule Audit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ROOT-LEVEL DIALOG: Create Checklist Dialog */}
      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Master Checklist</DialogTitle>
            <DialogDescription>Create a standardized inspection template.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createChecklist.mutateAsync({
                  name: clName,
                  area: clArea,
                  items: Number(clItems) || 5,
                  frequency: clFreq,
                });
                addToast({ title: 'Success', description: 'Checklist template created' });
                setChecklistDialogOpen(false);
                setClName('');
                setClArea('');
              } catch (err) {
                addToast({ title: 'Error', description: friendlyError(err), variant: 'destructive' });
              }
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="cl-name">Checklist Title *</Label>
              <Input
                id="cl-name"
                placeholder="e.g. DG Set & Electrical Panel Inspection"
                value={clName}
                onChange={(e) => setClName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-area">Area / Wing *</Label>
              <Input
                id="cl-area"
                placeholder="e.g. Basement 1 / Power House"
                value={clArea}
                onChange={(e) => setClArea(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cl-items">Checkpoint Count</Label>
                <Input
                  id="cl-items"
                  type="number"
                  value={clItems}
                  onChange={(e) => setClItems(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl-freq">Frequency</Label>
                <Select id="cl-freq" value={clFreq} onChange={(e) => setClFreq(e.target.value)}>
                  {CHECKLIST_FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createChecklist.isPending}>Create Checklist</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ROOT-LEVEL DIALOG: Record Conducted Audit Dialog */}
      <Dialog open={conductDialogOpen} onOpenChange={setConductDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Conducted Audit</DialogTitle>
            <DialogDescription>Log an inspection outcome with pass/fail checkpoints.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await recordConductedAudit.mutateAsync({
                  checklist: conductChecklist,
                  conducted_by: conductBy,
                  score: Number(conductScore),
                  passed: Number(conductPassed),
                  failed: Number(conductFailed),
                  status: conductStatus,
                  notes: conductNotes || undefined,
                });
                addToast({ title: 'Saved', description: 'Conducted audit recorded' });
                setConductDialogOpen(false);
                setConductChecklist('');
                setConductBy('');
                setConductNotes('');
              } catch (err) {
                addToast({ title: 'Error', description: friendlyError(err), variant: 'destructive' });
              }
            }}
            className="space-y-3 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="cond-cl">Checklist Name *</Label>
              <Input
                id="cond-cl"
                placeholder="e.g. DG Set Weekly Audit"
                value={conductChecklist}
                onChange={(e) => setConductChecklist(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cond-by">Conducted By *</Label>
              <Input
                id="cond-by"
                placeholder="Auditor name"
                value={conductBy}
                onChange={(e) => setConductBy(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="cond-score">Score (%)</Label>
                <Input
                  id="cond-score"
                  type="number"
                  value={conductScore}
                  onChange={(e) => setConductScore(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cond-p">Passed</Label>
                <Input
                  id="cond-p"
                  type="number"
                  value={conductPassed}
                  onChange={(e) => setConductPassed(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cond-f">Failed</Label>
                <Input
                  id="cond-f"
                  type="number"
                  value={conductFailed}
                  onChange={(e) => setConductFailed(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cond-status">Audit Result</Label>
              <Select
                id="cond-status"
                value={conductStatus}
                onChange={(e) => setConductStatus(e.target.value as typeof conductStatus)}
              >
                <option value="pass">Pass</option>
                <option value="conditional">Conditional</option>
                <option value="fail">Fail</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cond-notes">Notes / Observations</Label>
              <Input
                id="cond-notes"
                placeholder="Remarks..."
                value={conductNotes}
                onChange={(e) => setConductNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={recordConductedAudit.isPending}>Save Audit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ROOT-LEVEL DIALOG: Vendor Audit Dialog */}
      <Dialog open={vendorAuditDialogOpen} onOpenChange={setVendorAuditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Vendor Audit</DialogTitle>
            <DialogDescription>Assess contractor performance against SLA.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createVendorAudit.mutateAsync({
                  vendor_id: vaVendorId,
                  auditor_name: vaAuditor,
                  scheduled_date: vaDate,
                  compliance_rating: Number(vaRating),
                  notes: vaNotes || undefined,
                });
                addToast({ title: 'Success', description: 'Vendor audit recorded' });
                setVendorAuditDialogOpen(false);
                setVaVendorId('');
                setVaAuditor('');
                setVaDate('');
                setVaNotes('');
              } catch (err) {
                addToast({ title: 'Error', description: friendlyError(err), variant: 'destructive' });
              }
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="va-vendor">Vendor *</Label>
              <Select
                id="va-vendor"
                value={vaVendorId}
                onChange={(e) => setVaVendorId(e.target.value)}
                required
              >
                <option value="">Select vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="va-auditor">Auditor Name *</Label>
              <Input
                id="va-auditor"
                value={vaAuditor}
                onChange={(e) => setVaAuditor(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="va-date">Date *</Label>
                <Input
                  id="va-date"
                  type="date"
                  value={vaDate}
                  onChange={(e) => setVaDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="va-rating">Rating (1-5)</Label>
                <Select id="va-rating" value={vaRating} onChange={(e) => setVaRating(e.target.value)}>
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Satisfactory</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Critical Breach</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="va-notes">Notes</Label>
              <Input
                id="va-notes"
                placeholder="Findings and remarks..."
                value={vaNotes}
                onChange={(e) => setVaNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createVendorAudit.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AssetQrDialog asset={qrModalAsset} onClose={() => setQrModalAsset(null)} />
      {assetDialogOpen && (
        <AssetForm
          mode="dialog"
          open
          asset={editingAsset}
          onClose={() => setAssetDialogOpen(false)}
          onSaved={() => setAssetDialogOpen(false)}
        />
      )}
      <AmcEditDialog amc={editingAmc} onClose={() => setEditingAmc(null)} />
    </div>
  );
}
