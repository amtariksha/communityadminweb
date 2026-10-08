'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  Pencil,
  Wrench,
  AlertTriangle,
  Clock,
  Package,
  QrCode,
  Printer,
  ClipboardCheck,
  Calendar,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  useAssets,
  useAssetDashboard,
  useAMCs,
  useServiceLogs,
  useCreateAsset,
  useUpdateAsset,
  useCreateAMC,
  useUpdateAMC,
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
import { useVendors, useStaffEmployees } from '@/hooks';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// 2026-05-09 (QA #350) \u2014 Asset type list must match the backend
// Zod enum exactly:
//   apps/api/src/modules/asset/asset.controller.ts \u2192
//   z.enum(['equipment','furniture','vehicle','infrastructure',
//           'electrical','plumbing','fire_safety','security','hvac',
//           'elevator','generator','cctv','other'])
// The previous UI exposed `heater`, `stp`, `pump`, `ac`, `gas_bank`,
// `transformer`, `fire_system`, `gym_equipment`, `lift` \u2014 none of
// which the backend accepts \u2192 every Save click 400'd with an enum
// validation error. We could have expanded the backend enum but
// the user preferred tightening the UI to the 13 sanctioned
// values (per the bug-triage decision log). The label is the
// human-readable label; the value is the wire format.
const ASSET_TYPES = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'security', label: 'Security' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'elevator', label: 'Elevator' },
  { value: 'generator', label: 'Generator' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'other', label: 'Other' },
];

const ASSET_TYPE_ICONS: Record<string, string> = {
  equipment: '\uD83D\uDD27',
  furniture: '\uD83D\uDECB',
  vehicle: '\uD83D\uDE97',
  infrastructure: '\uD83C\uDFD7',
  electrical: '\u26A1',
  plumbing: '\uD83D\uDD27',
  fire_safety: '\uD83D\uDD25',
  security: '\uD83D\uDD12',
  hvac: '\u2744\uFE0F',
  elevator: '\uD83D\uDED7',
  generator: '\u26A1',
  cctv: '\uD83D\uDCF9',
};

const CONDITIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'critical', label: 'Critical' },
];

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

const AMC_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function conditionBadgeVariant(condition: string): 'success' | 'default' | 'warning' | 'destructive' {
  switch (condition) {
    case 'excellent':
    case 'good':
      return 'success';
    case 'fair':
      return 'warning';
    case 'poor':
    case 'critical':
      return 'destructive';
    default:
      return 'default';
  }
}

function warrantyStatus(expiryDate: string): { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' } {
  if (!expiryDate) return { label: 'N/A', variant: 'secondary' };
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: 'Expired', variant: 'destructive' };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, variant: 'warning' };
  return { label: 'Active', variant: 'success' };
}

function daysRemaining(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

  // Asset dialog
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('generator');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetManufacturer, setAssetManufacturer] = useState('');
  const [assetModel, setAssetModel] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetPurchaseDate, setAssetPurchaseDate] = useState('');
  const [assetPurchaseCost, setAssetPurchaseCost] = useState('');
  const [assetWarrantyExpiry, setAssetWarrantyExpiry] = useState('');
  const [assetCondition, setAssetCondition] = useState('good');

  // AMC dialog
  const [amcDialogOpen, setAmcDialogOpen] = useState(false);
  const [amcAssetId, setAmcAssetId] = useState('');
  const [amcVendorId, setAmcVendorId] = useState('');
  const [amcContractNumber, setAmcContractNumber] = useState('');
  const [amcStartDate, setAmcStartDate] = useState('');
  const [amcEndDate, setAmcEndDate] = useState('');
  const [amcAmount, setAmcAmount] = useState('');
  const [amcFrequency, setAmcFrequency] = useState('quarterly');

  // Service dialog
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceAssetId, setServiceAssetId] = useState('');
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
  const [schedStaffId, setSchedStaffId] = useState('');

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
  const { data: assetsData, isLoading: assetsLoading } = useAssets();
  const { data: amcsData, isLoading: amcsLoading } = useAMCs();
  const { data: vendorsResponse } = useVendors();
  const vendors = (vendorsResponse as unknown as { data: Array<{ id: string; name: string }> })?.data ?? [];
  const { data: staffData } = useStaffEmployees();
  const staffList = staffData?.data ?? [];

  // For service logs, show all when no specific asset is selected
  const [serviceFilterAssetId, setServiceFilterAssetId] = useState('');
  const { data: serviceLogs, isLoading: servicesLoading } = useServiceLogs(serviceFilterAssetId);

  const assets = assetsData?.data ?? [];
  const amcs = amcsData?.data ?? [];
  const services = (serviceLogs as ServiceLog[] | undefined) ?? [];

  // Mutations
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const createAMC = useCreateAMC();
  const logService = useLogService();

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  function resetAssetForm(): void {
    setEditingAsset(null);
    setAssetName('');
    setAssetType('generator');
    setAssetLocation('');
    setAssetManufacturer('');
    setAssetModel('');
    setAssetSerial('');
    setAssetPurchaseDate('');
    setAssetPurchaseCost('');
    setAssetWarrantyExpiry('');
    setAssetCondition('good');
  }

  function openEditAsset(asset: Asset): void {
    setEditingAsset(asset);
    setAssetName(asset.name);
    setAssetType(asset.asset_type);
    setAssetLocation(asset.location);
    setAssetManufacturer(asset.manufacturer);
    setAssetModel(asset.model);
    setAssetSerial(asset.serial_number);
    setAssetPurchaseDate(asset.purchase_date ? asset.purchase_date.split('T')[0] : '');
    setAssetPurchaseCost(String(asset.purchase_cost ?? ''));
    setAssetWarrantyExpiry(asset.warranty_expiry ? asset.warranty_expiry.split('T')[0] : '');
    setAssetCondition(asset.condition);
    setAssetDialogOpen(true);
  }

  function handleAssetSubmit(e: FormEvent): void {
    e.preventDefault();
    const payload = {
      name: assetName,
      asset_type: assetType,
      location: assetLocation,
      manufacturer: assetManufacturer || undefined,
      model: assetModel || undefined,
      serial_number: assetSerial || undefined,
      purchase_date: assetPurchaseDate || undefined,
      purchase_cost: assetPurchaseCost ? Number(assetPurchaseCost) : undefined,
      warranty_expiry: assetWarrantyExpiry || undefined,
      condition: assetCondition || undefined,
    };

    if (editingAsset) {
      updateAsset.mutate(
        { id: editingAsset.id, ...payload },
        {
          onSuccess() {
            addToast({ title: 'Asset updated', variant: 'success' });
            setAssetDialogOpen(false);
            resetAssetForm();
          },
          onError(err) {
            addToast({ title: 'Failed to update asset', description: friendlyError(err), variant: 'destructive' });
          },
        },
      );
    } else {
      createAsset.mutate(payload, {
        onSuccess() {
          addToast({ title: 'Asset created', variant: 'success' });
          setAssetDialogOpen(false);
          resetAssetForm();
        },
        onError(err) {
          addToast({ title: 'Failed to create asset', description: friendlyError(err), variant: 'destructive' });
        },
      });
    }
  }

  function resetAmcForm(): void {
    setAmcAssetId('');
    setAmcVendorId('');
    setAmcContractNumber('');
    setAmcStartDate('');
    setAmcEndDate('');
    setAmcAmount('');
    setAmcFrequency('quarterly');
  }

  function handleAmcSubmit(e: FormEvent): void {
    e.preventDefault();
    createAMC.mutate(
      {
        asset_id: amcAssetId,
        vendor_id: amcVendorId,
        contract_number: amcContractNumber,
        start_date: amcStartDate,
        end_date: amcEndDate,
        amount: Number(amcAmount),
        frequency: amcFrequency,
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
    setServiceAssetId('');
    setServiceType('maintenance');
    setServiceDate('');
    setServiceVendor('');
    setServiceDescription('');
    setServiceCost('');
    setServiceNextDue('');
  }

  function handleServiceSubmit(e: FormEvent): void {
    e.preventDefault();
    logService.mutate(
      {
        asset_id: serviceAssetId,
        service_type: serviceType,
        service_date: serviceDate,
        vendor_name: serviceVendor || undefined,
        description: serviceDescription || undefined,
        cost: serviceCost ? Number(serviceCost) : undefined,
        next_service_due: serviceNextDue || undefined,
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
              value={dashboard?.expiring_soon ?? 0}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Assets</CardTitle>
            <Dialog open={assetDialogOpen} onOpenChange={(open) => { setAssetDialogOpen(open); if (!open) resetAssetForm(); }}>
              <DialogTrigger>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <form onSubmit={handleAssetSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingAsset ? 'Edit Asset' : 'Create Asset'}</DialogTitle>
                    <DialogDescription>
                      {editingAsset ? 'Update asset details' : 'Add a new asset to track'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="asset-name">Name *</Label>
                      <Input id="asset-name" value={assetName} onChange={(e) => setAssetName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asset-type">Type *</Label>
                      <Select id="asset-type" value={assetType} onChange={(e) => setAssetType(e.target.value)}>
                        {ASSET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asset-location">Location *</Label>
                      <Input id="asset-location" value={assetLocation} onChange={(e) => setAssetLocation(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asset-manufacturer">Manufacturer</Label>
                      <Input id="asset-manufacturer" value={assetManufacturer} onChange={(e) => setAssetManufacturer(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asset-model">Model</Label>
                      <Input id="asset-model" value={assetModel} onChange={(e) => setAssetModel(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asset-serial">Serial Number</Label>
                      <Input id="asset-serial" value={assetSerial} onChange={(e) => setAssetSerial(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asset-purchase-date">Purchase Date</Label>
                      <Input id="asset-purchase-date" type="date" value={assetPurchaseDate} onChange={(e) => setAssetPurchaseDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asset-cost">Purchase Cost</Label>
                      <Input id="asset-cost" type="number" value={assetPurchaseCost} onChange={(e) => setAssetPurchaseCost(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asset-warranty">Warranty Expiry</Label>
                      <Input id="asset-warranty" type="date" value={assetWarrantyExpiry} onChange={(e) => setAssetWarrantyExpiry(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asset-condition">Condition</Label>
                      <Select id="asset-condition" value={assetCondition} onChange={(e) => setAssetCondition(e.target.value)}>
                        {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createAsset.isPending || updateAsset.isPending}>
                      {editingAsset ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {assetsLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="mb-2 h-10 w-10" />
                <p className="text-lg font-medium">No assets found</p>
                <p className="text-sm">Add your first asset to start tracking</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => {
                    const warranty = warrantyStatus(asset.warranty_expiry);
                    return (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>
                          <span className="mr-1">{ASSET_TYPE_ICONS[asset.asset_type] ?? ''}</span>
                          <span className="capitalize">{asset.asset_type.replace(/_/g, ' ')}</span>
                        </TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>
                          <Badge variant={conditionBadgeVariant(asset.condition)}>
                            {asset.condition}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={warranty.variant}>{warranty.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{asset.manufacturer}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="rounded p-1 hover:bg-muted"
                              onClick={() => setQrModalAsset(asset)}
                              title="View & Print QR Code"
                            >
                              <QrCode className="h-4 w-4 text-primary" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1 hover:bg-muted"
                              onClick={() => openEditAsset(asset)}
                              title="Edit asset"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
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
                      <Select id="amc-asset" value={amcAssetId} onChange={(e) => setAmcAssetId(e.target.value)} required>
                        <option value="">Select asset</option>
                        {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </Select>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amc-amount">Amount *</Label>
                        <Input id="amc-amount" type="number" value={amcAmount} onChange={(e) => setAmcAmount(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amc-frequency">Frequency *</Label>
                        <Select id="amc-frequency" value={amcFrequency} onChange={(e) => setAmcFrequency(e.target.value)}>
                          {AMC_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </Select>
                      </div>
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
                    <TableHead>Status</TableHead>
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
                        <TableCell>{formatCurrency(amc.amount)}</TableCell>
                        <TableCell>
                          <span className={days < 30 ? 'font-semibold text-destructive' : ''}>
                            {days > 0 ? `${days} days` : 'Expired'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={amc.status === 'active' ? 'success' : 'secondary'}>
                            {amc.status}
                          </Badge>
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
                      <Select id="service-asset" value={serviceAssetId} onChange={(e) => setServiceAssetId(e.target.value)} required>
                        <option value="">Select asset</option>
                        {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </Select>
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
                      <Label htmlFor="service-desc">Description</Label>
                      <Input id="service-desc" value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} />
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
                      <TableCell>{formatDate(svc.next_service_due)}</TableCell>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Checklist Name</TableHead>
                    <TableHead>Area / Wing</TableHead>
                    <TableHead>Item Count</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Last Run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checklists.map((cl) => (
                    <TableRow key={cl.id}>
                      <TableCell className="font-medium">{cl.name}</TableCell>
                      <TableCell>{cl.area}</TableCell>
                      <TableCell>{cl.items} checkpoints</TableCell>
                      <TableCell className="capitalize">
                        <Badge variant="outline">{cl.frequency}</Badge>
                      </TableCell>
                      <TableCell>{cl.last_run ? formatDate(cl.last_run) : 'Never'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              try {
                await createSchedule.mutateAsync({
                  checklist_id: schedChecklistId || undefined,
                  checklist: selectedCl?.name || 'General Equipment Audit',
                  scheduled_date: schedDate,
                  assigned_to_user_id: schedStaffId || undefined,
                });
                addToast({ title: 'Scheduled', description: 'Audit round successfully scheduled' });
                setScheduleDialogOpen(false);
                setSchedChecklistId('');
                setSchedDate('');
                setSchedStaffId('');
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
              <Label htmlFor="sched-staff">Assign To Staff *</Label>
              <Select
                id="sched-staff"
                value={schedStaffId}
                onChange={(e) => setSchedStaffId(e.target.value)}
                required
              >
                <option value="">Select staff member...</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.staff_type})</option>
                ))}
              </Select>
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
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
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

      {/* ROOT-LEVEL DIALOG: QR Sticker Modal */}
      <Dialog open={Boolean(qrModalAsset)} onOpenChange={(open) => !open && setQrModalAsset(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Asset QR Badge
            </DialogTitle>
            <DialogDescription>
              Printable equipment verification badge for field scanning and inspection.
            </DialogDescription>
          </DialogHeader>
          {qrModalAsset && (
            <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-card space-y-4">
              <div className="p-4 bg-white rounded-lg shadow-sm border">
                <QRCodeSVG
                  value={`ASSET:${qrModalAsset.id}:${qrModalAsset.name}`}
                  size={180}
                  level="H"
                />
              </div>
              <div className="text-center space-y-1">
                <div className="font-bold text-base">{qrModalAsset.name}</div>
                <div className="text-[11px] text-muted-foreground font-mono">ID: {qrModalAsset.id}</div>
                <div className="text-xs font-medium text-muted-foreground">
                  Location: {qrModalAsset.location} · {qrModalAsset.asset_type}
                </div>
                {qrModalAsset.serial_number && (
                  <div className="text-xs text-muted-foreground">S/N: {qrModalAsset.serial_number}</div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex items-center gap-2">
            <DialogClose>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />
              Print QR Badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
