'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MapPin, Plus, Printer, Route as RouteIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  usePatrolRoutes,
  usePatrolCheckpoints,
  useCreateRoute,
  useAddCheckpoint,
  type PatrolRoute,
  type PatrolCheckpoint,
} from '@/hooks/use-patrol';

export default function PatrolContent(): ReactNode {
  const { addToast } = useToast();
  const { data: routes, isLoading } = usePatrolRoutes();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = routes?.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guard Patrol"
        description="Configure patrol routes and checkpoints. Print each checkpoint's QR and post it on-site — guards scan them during a round."
      />

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <RoutesPanel
          routes={routes}
          isLoading={isLoading}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onError={(e) =>
            addToast({ title: friendlyError(e), variant: 'destructive' })
          }
        />
        {selected ? (
          <CheckpointsPanel
            route={selected}
            onError={(e) =>
              addToast({ title: friendlyError(e), variant: 'destructive' })
            }
          />
        ) : (
          <Card>
            <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
              Select a route to manage its checkpoints.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function RoutesPanel({
  routes,
  isLoading,
  selectedId,
  onSelect,
  onError,
}: {
  routes: PatrolRoute[] | undefined;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onError: (e: unknown) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expected, setExpected] = useState('');
  const createRoute = useCreateRoute();

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (name.trim().length < 2) return;
    try {
      const res = await createRoute.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        expected_minutes: expected ? parseInt(expected, 10) : undefined,
      });
      setOpen(false);
      setName('');
      setDescription('');
      setExpected('');
      onSelect(res.data.id);
    } catch (e) {
      onError(e);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Routes</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !routes || routes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No routes yet. Create one to start.
          </p>
        ) : (
          routes.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                r.id === selectedId ? 'bg-muted font-medium' : 'hover:bg-muted/60'
              }`}
            >
              <RouteIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{r.name}</span>
              {!r.is_active && <Badge variant="secondary">inactive</Badge>}
            </button>
          ))
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>New patrol route</DialogTitle>
              <DialogDescription>
                A route is a named sequence of checkpoints a guard walks.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="space-y-1">
                <Label htmlFor="route-name">Name</Label>
                <Input
                  id="route-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Night round — Block A"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="route-desc">Description (optional)</Label>
                <Textarea
                  id="route-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="route-mins">Expected minutes (optional)</Label>
                <Input
                  id="route-mins"
                  type="number"
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createRoute.isPending}>
                {createRoute.isPending ? 'Creating…' : 'Create route'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function CheckpointsPanel({
  route,
  onError,
}: {
  route: PatrolRoute;
  onError: (e: unknown) => void;
}): ReactNode {
  const { data: checkpoints, isLoading } = usePatrolCheckpoints(route.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [sequence, setSequence] = useState('');
  const addCheckpoint = useAddCheckpoint();

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (name.trim().length < 1) return;
    try {
      await addCheckpoint.mutateAsync({
        routeId: route.id,
        name: name.trim(),
        location_note: note.trim() || undefined,
        sequence: sequence ? parseInt(sequence, 10) : undefined,
      });
      setOpen(false);
      setName('');
      setNote('');
      setSequence('');
    } catch (e) {
      onError(e);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{route.name} — checkpoints</CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            disabled={!checkpoints || checkpoints.length === 0}
          >
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add checkpoint
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !checkpoints || checkpoints.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No checkpoints yet. Add one — it gets a printable QR the guard scans.
          </p>
        ) : (
          <div className="print-sheet grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-6 print:p-6">
            {checkpoints
              .slice()
              .sort((a, b) => a.sequence - b.sequence)
              .map((c) => (
                <CheckpointCard key={c.id} checkpoint={c} />
              ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Add checkpoint</DialogTitle>
              <DialogDescription>
                A QR code is generated automatically — print and post it on-site.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="space-y-1">
                <Label htmlFor="cp-name">Name</Label>
                <Input
                  id="cp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rear gate"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-seq">Order (optional)</Label>
                <Input
                  id="cp-seq"
                  type="number"
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-note">Location note (optional)</Label>
                <Input
                  id="cp-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Behind the transformer room"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={addCheckpoint.isPending}>
                {addCheckpoint.isPending ? 'Adding…' : 'Add checkpoint'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CheckpointCard({ checkpoint }: { checkpoint: PatrolCheckpoint }): ReactNode {
  return (
    <div className="flex flex-col items-center rounded-lg border p-4 text-center">
      <QRCodeSVG value={checkpoint.qr_code} size={140} includeMargin />
      <p className="mt-3 font-medium">{checkpoint.name}</p>
      {checkpoint.location_note && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> {checkpoint.location_note}
        </p>
      )}
      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
        {checkpoint.qr_code}
      </p>
    </div>
  );
}
