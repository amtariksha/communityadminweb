'use client';

import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  Video,
  Settings,
  Maximize2,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import {
  useCameras,
  useCreateCamera,
  useUpdateCamera,
  useDeleteCamera,
} from '@/hooks/use-cameras';
import type { Camera } from '@/hooks/use-cameras';
import { useGates } from '@/hooks';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAG_COLORS: Record<string, string> = {
  entry_gate: 'bg-success/15 text-success',
  exit_gate: 'bg-success/15 text-success',
  parking: 'bg-primary/15 text-primary',
  lobby: 'bg-muted text-muted-foreground',
  corridor: 'bg-muted text-muted-foreground',
  perimeter: 'bg-warning/15 text-warning',
  other: 'bg-muted text-muted-foreground',
};

const TAGS = [
  { value: 'entry_gate', label: 'Entry Gate' },
  { value: 'exit_gate', label: 'Exit Gate' },
  { value: 'parking', label: 'Parking' },
  { value: 'lobby', label: 'Lobby' },
  { value: 'corridor', label: 'Corridor' },
  { value: 'perimeter', label: 'Perimeter' },
  { value: 'other', label: 'Other' },
];

const BRANDS = [
  { value: 'hikvision', label: 'Hikvision' },
  { value: 'dahua', label: 'Dahua' },
  { value: 'cp_plus', label: 'CP Plus' },
  { value: 'honeywell', label: 'Honeywell' },
  { value: 'bosch', label: 'Bosch' },
  { value: 'axis', label: 'Axis' },
  { value: 'samsung', label: 'Samsung' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Camera feed component with auto-refresh
// ---------------------------------------------------------------------------

interface CameraFeedProps {
  camera: Camera;
}

function CameraFeed({ camera }: CameraFeedProps): ReactNode {
  const [timestamp, setTimestamp] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTimestamp(Date.now()), 3000);
    return () => clearInterval(interval);
  }, []);

  const snapshotUrl = camera.snapshot_url
    ? `https://community.eassy.life/cameras/${camera.id}/snapshot?t=${timestamp}`
    : null;

  return snapshotUrl ? (
    <img
      src={snapshotUrl}
      alt={camera.name}
      className="w-full h-48 object-cover rounded"
    />
  ) : (
    <div className="w-full h-48 bg-muted flex items-center justify-center rounded gap-2">
      <Video className="h-8 w-8 text-muted-foreground" />
      <span className="text-muted-foreground text-sm">No snapshot URL</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fullscreen view
// ---------------------------------------------------------------------------

interface FullscreenViewProps {
  camera: Camera;
  onClose: () => void;
}

function FullscreenView({ camera, onClose }: FullscreenViewProps): ReactNode {
  const [timestamp, setTimestamp] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTimestamp(Date.now()), 3000);
    return () => clearInterval(interval);
  }, []);

  const snapshotUrl = camera.snapshot_url
    ? `https://community.eassy.life/cameras/${camera.id}/snapshot?t=${timestamp}`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="text-white font-medium">{camera.name}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      </div>
      {snapshotUrl ? (
        <img
          src={snapshotUrl}
          alt={camera.name}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-white">
          <Video className="h-16 w-16" />
          <span>No snapshot URL configured</span>
        </div>
      )}
      <p className="mt-4 text-sm text-white/60">{camera.location}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CctvContent(): ReactNode {
  const { addToast } = useToast();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [fullscreenCamera, setFullscreenCamera] = useState<Camera | null>(null);

  // Form state
  const [cameraName, setCameraName] = useState('');
  const [cameraLocation, setCameraLocation] = useState('');
  const [cameraTag, setCameraTag] = useState('other');
  const [cameraSnapshotUrl, setCameraSnapshotUrl] = useState('');
  const [cameraStreamUrl, setCameraStreamUrl] = useState('');
  const [cameraBrand, setCameraBrand] = useState('hikvision');
  const [cameraGateId, setCameraGateId] = useState('');

  // Queries
  const { data: cameras, isLoading } = useCameras();
  const { data: gatesData } = useGates();
  const gates = gatesData ?? [];

  // Mutations
  const createCamera = useCreateCamera();
  const updateCamera = useUpdateCamera();
  const deleteCamera = useDeleteCamera();

  function resetForm(): void {
    setEditingCamera(null);
    setCameraName('');
    setCameraLocation('');
    setCameraTag('other');
    setCameraSnapshotUrl('');
    setCameraStreamUrl('');
    setCameraBrand('hikvision');
    setCameraGateId('');
  }

  function openEdit(camera: Camera): void {
    setEditingCamera(camera);
    setCameraName(camera.name);
    setCameraLocation(camera.location);
    setCameraTag(camera.tag || 'other');
    setCameraSnapshotUrl(camera.snapshot_url || '');
    setCameraStreamUrl(camera.stream_url || '');
    setCameraBrand(camera.brand || 'hikvision');
    setCameraGateId(camera.gate_id || '');
    setDialogOpen(true);
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();

    const payload = {
      name: cameraName,
      location: cameraLocation,
      tag: cameraTag,
      snapshot_url: cameraSnapshotUrl || undefined,
      stream_url: cameraStreamUrl || undefined,
      brand: cameraBrand || undefined,
      gate_id: cameraGateId || undefined,
    };

    if (editingCamera) {
      updateCamera.mutate(
        { id: editingCamera.id, ...payload },
        {
          onSuccess() {
            addToast({ title: 'Camera updated', variant: 'success' });
            setDialogOpen(false);
            resetForm();
          },
          onError(err) {
            addToast({ title: 'Failed to update camera', description: err.message, variant: 'destructive' });
          },
        },
      );
    } else {
      createCamera.mutate(payload, {
        onSuccess() {
          addToast({ title: 'Camera added', variant: 'success' });
          setDialogOpen(false);
          resetForm();
        },
        onError(err) {
          addToast({ title: 'Failed to add camera', description: err.message, variant: 'destructive' });
        },
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'CCTV' }]}
        title="CCTV Cameras"
        description="Monitor and manage security cameras"
        actions={
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Camera
          </Button>
        }
      />

      {/* Camera grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-48 w-full rounded" />
                <Skeleton className="mt-3 h-5 w-1/2" />
                <Skeleton className="mt-1 h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !cameras || cameras.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Video className="mb-2 h-10 w-10" />
            <p className="text-lg font-medium">No cameras configured</p>
            <p className="text-sm">Add your first camera to start monitoring</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cameras.map((camera) => (
            <Card
              key={camera.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFullscreenCamera(camera)}
            >
              <CardContent className="pt-6">
                <div className="relative">
                  <CameraFeed camera={camera} />
                  {/* Status dot */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`inline-block h-3 w-3 rounded-full ${
                        camera.is_active ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                      title={camera.is_active ? 'Active' : 'Inactive'}
                    />
                  </div>
                  {/* Fullscreen button */}
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 rounded bg-black/50 p-1 hover:bg-black/70 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullscreenCamera(camera);
                    }}
                    title="Fullscreen"
                  >
                    <Maximize2 className="h-4 w-4 text-white" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{camera.name}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TAG_COLORS[camera.tag] ?? TAG_COLORS.other}`}>
                        {camera.tag?.replace(/_/g, ' ') ?? 'other'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{camera.location}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded p-1.5 hover:bg-muted transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(camera);
                    }}
                    title="Settings"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Fullscreen overlay */}
      {fullscreenCamera && (
        <FullscreenView
          camera={fullscreenCamera}
          onClose={() => setFullscreenCamera(null)}
        />
      )}

      {/* Add/Edit camera dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingCamera ? 'Edit Camera' : 'Add Camera'}</DialogTitle>
              <DialogDescription>
                {editingCamera ? 'Update camera settings' : 'Configure a new camera'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cam-name">Name *</Label>
                <Input
                  id="cam-name"
                  placeholder="e.g., Main Gate Camera 1"
                  value={cameraName}
                  onChange={(e) => setCameraName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cam-location">Location *</Label>
                <Input
                  id="cam-location"
                  placeholder="e.g., Main Gate Entrance"
                  value={cameraLocation}
                  onChange={(e) => setCameraLocation(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cam-tag">Tag</Label>
                  <Select id="cam-tag" value={cameraTag} onChange={(e) => setCameraTag(e.target.value)}>
                    {TAGS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cam-brand">Brand</Label>
                  <Select id="cam-brand" value={cameraBrand} onChange={(e) => setCameraBrand(e.target.value)}>
                    {BRANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cam-snapshot">Snapshot URL</Label>
                <Input
                  id="cam-snapshot"
                  placeholder="http://camera-ip/snapshot"
                  value={cameraSnapshotUrl}
                  onChange={(e) => setCameraSnapshotUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cam-stream">Stream URL</Label>
                <Input
                  id="cam-stream"
                  placeholder="rtsp://camera-ip/stream"
                  value={cameraStreamUrl}
                  onChange={(e) => setCameraStreamUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cam-gate">Linked Gate</Label>
                <Select id="cam-gate" value={cameraGateId} onChange={(e) => setCameraGateId(e.target.value)}>
                  <option value="">No gate linked</option>
                  {(gates as Array<{ id: string; name: string }>).map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createCamera.isPending || updateCamera.isPending}>
                {editingCamera ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
