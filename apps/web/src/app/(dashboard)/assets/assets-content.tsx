'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  Pencil,
  Wrench,
  AlertTriangle,
  Clock,
  Package,
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
  useAssets,
  useAssetDashboard,
  useAMCs,
  useServiceLogs,
  useCreateAsset,
  useUpdateAsset,
  useCreateAMC,
  useUpdateAMC,
  useLogService,
} from '@/hooks/use-assets';
import type { Asset, AMCContract, ServiceLog } from '@/hooks/use-assets';
import { useVendors } from '@/hooks';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ASSET_TYPES = [
  { value: 'generator', label: 'Generator' },
  { value: 'stp', label: 'STP' },
  { value: 'pump', label: 'Pump' },
  { value: 'lift', label: 'Lift' },
  { value: 'ac', label: 'AC' },
  { value: 'heater', label: 'Heater' },
  { value: 'gas_bank', label: 'Gas Bank' },
  { value: 'transformer', label: 'Transformer' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'fire_system', label: 'Fire System' },
  { value: 'gym_equipment', label: 'Gym Equipment' },
  { value: 'other', label: 'Other' },
];

const ASSET_TYPE_ICONS: Record<string, string> = {
  generator: '\u26A1',
  stp: '\uD83D\uDD04',
  pump: '\uD83D\uDCA7',
  lift: '\uD83D\uDED7',
  ac: '\u2744\uFE0F',
  heater: '\uD83D\uDD25',
  gas_bank: '\uD83D\uDD35',
  transformer: '\u26A1',
  cctv: '\uD83D\uDCF9',
  fire_system: '\uD83D\uDD25',
  gym_equipment: '\uD83D\uDCAA',
};

const CONDITIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'critical', label: 'Critical' },
];

const SERVICE_TYPES = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'calibration', label: 'Calibration' },
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
  const [activeTab, setActiveTab] = useState<'assets' | 'amc' | 'services'>('assets');

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
  const [serviceType, setServiceType] = useState('preventive');
  const [serviceDate, setServiceDate] = useState('');
  const [serviceVendor, setServiceVendor] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  const [serviceNextDue, setServiceNextDue] = useState('');

  // Queries
  const { data: dashboard, isLoading: dashLoading } = useAssetDashboard();
  const { data: assetsData, isLoading: assetsLoading } = useAssets();
  const { data: amcsData, isLoading: amcsLoading } = useAMCs();
  const { data: vendorsResponse } = useVendors();
  const vendors = (vendorsResponse as unknown as { data: Array<{ id: string; name: string }> })?.data ?? [];

  // For service logs, show all when no specific asset is selected
  const [serviceFilterAssetId, setServiceFilterAssetId] = useState('');
  // QA #257 — empty string asks the hook to hit the tenant-wide
  // /assets/service-logs route. Sending the literal `_all` used to
  // route through `/assets/:id/services` and trip ParseUUIDPipe.
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
    setServiceType('preventive');
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
      <div className="flex gap-1 border-b">
        {(['assets', 'amc', 'services'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'assets' ? 'Assets' : tab === 'amc' ? 'AMC Contracts' : 'Service History'}
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
                          <button
                            type="button"
                            className="rounded p-1 hover:bg-muted"
                            onClick={() => openEditAsset(asset)}
                            title="Edit asset"
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
                        <Badge variant={svc.service_type === 'emergency' ? 'destructive' : svc.service_type === 'preventive' ? 'success' : 'default'}>
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
    </div>
  );
}
