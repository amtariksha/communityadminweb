'use client';

import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  MapPin,
  Megaphone,
  Siren,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useSosAlerts,
  useSosDetail,
  useAcknowledgeSos,
  useResolveSos,
  useBroadcasts,
  useCreateBroadcast,
  useStandDownBroadcast,
  type SosAlert,
  type SosStatus,
  type BroadcastCategory,
} from '@/hooks/use-sos';

const CATEGORY_BADGE: Record<string, string> = {
  panic: 'bg-red-600 text-white',
  medical: 'bg-rose-500 text-white',
  fire: 'bg-orange-600 text-white',
  security: 'bg-amber-600 text-white',
  other: 'bg-slate-600 text-white',
};

function statusVariant(
  status: SosStatus,
): 'destructive' | 'warning' | 'success' | 'secondary' {
  if (status === 'active') return 'destructive';
  if (status === 'acknowledged') return 'warning';
  if (status === 'resolved') return 'success';
  return 'secondary';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SosContent(): ReactNode {
  const { addToast } = useToast();
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [timelineId, setTimelineId] = useState<string>('');
  const [sirenOpen, setSirenOpen] = useState(false);

  const liveQuery = useSosAlerts(filter === 'active' ? 'active' : undefined);
  const ackQuery = useSosAlerts('acknowledged');
  const broadcasts = useBroadcasts();

  const acknowledge = useAcknowledgeSos();
  const resolve = useResolveSos();
  const standDown = useStandDownBroadcast();

  // When filtering "active" we also want acknowledged (in-progress) alerts.
  const alerts: SosAlert[] =
    filter === 'active'
      ? [...(liveQuery.data?.data ?? []), ...(ackQuery.data?.data ?? [])]
      : (liveQuery.data?.data ?? []);

  function handleAck(id: string): void {
    acknowledge.mutate(id, {
      onSuccess: () => addToast({ title: 'Acknowledged', variant: 'success' }),
      onError: (e) =>
        addToast({
          title: 'Could not acknowledge',
          description: friendlyError(e),
          variant: 'destructive',
        }),
    });
  }

  function handleResolve(id: string, status: 'resolved' | 'false_alarm'): void {
    resolve.mutate(
      { id, status },
      {
        onSuccess: () =>
          addToast({
            title: status === 'resolved' ? 'Resolved' : 'Marked false alarm',
            variant: 'success',
          }),
        onError: (e) =>
          addToast({
            title: 'Action failed',
            description: friendlyError(e),
            variant: 'destructive',
          }),
      },
    );
  }

  const isLoading = liveQuery.isLoading && filter === 'active';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            SOS &amp; Safety
          </h1>
          <p className="text-sm text-muted-foreground">
            Live emergency alerts. Acknowledge to let the resident know help is
            coming, then resolve once handled.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setSirenOpen(true)}>
          <Siren className="mr-2 h-4 w-4" />
          Mass siren
        </Button>
      </div>

      <div className="flex gap-2">
        {(['active', 'all'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'active' ? 'Active & in-progress' : 'All'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No {filter === 'active' ? 'active' : ''} SOS alerts. All clear.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        CATEGORY_BADGE[a.category] ?? CATEGORY_BADGE.other
                      }`}
                    >
                      {a.category.toUpperCase()}
                    </span>
                    <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {timeAgo(a.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {a.triggered_by_name ?? 'A member'}
                    {a.unit_number ? ` · Unit ${a.unit_number}` : ''}
                    <span className="text-muted-foreground">
                      {' '}
                      ({a.triggerer_role})
                    </span>
                  </p>
                  {(a.location_text || a.latitude) && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {a.location_text ??
                        `${a.latitude}, ${a.longitude}`}
                    </p>
                  )}
                  {a.note && <p className="text-sm">{a.note}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTimelineId(a.id)}
                  >
                    Timeline
                  </Button>
                  {a.status === 'active' && (
                    <Button
                      size="sm"
                      onClick={() => handleAck(a.id)}
                      disabled={acknowledge.isPending}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Acknowledge
                    </Button>
                  )}
                  {(a.status === 'active' || a.status === 'acknowledged') && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(a.id, 'resolved')}
                        disabled={resolve.isPending}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResolve(a.id, 'false_alarm')}
                        disabled={resolve.isPending}
                      >
                        <X className="mr-1 h-4 w-4" />
                        False alarm
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent mass-siren broadcasts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" />
            Recent broadcasts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(broadcasts.data?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
          ) : (
            (broadcasts.data?.data ?? []).map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {b.title}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({b.category} · {b.audience} · {b.recipient_count} sent ·{' '}
                      {timeAgo(b.created_at)})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{b.message}</p>
                </div>
                {b.is_active ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      standDown.mutate(b.id, {
                        onSuccess: () =>
                          addToast({ title: 'Stood down', variant: 'success' }),
                      })
                    }
                  >
                    Stand down
                  </Button>
                ) : (
                  <Badge variant="secondary">stood down</Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <TimelineDialog id={timelineId} onClose={() => setTimelineId('')} />
      <SirenDialog open={sirenOpen} onClose={() => setSirenOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Incident timeline
// ---------------------------------------------------------------------------

function TimelineDialog({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}): ReactNode {
  const { data, isLoading } = useSosDetail(id);
  return (
    <Dialog open={id !== ''} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Incident timeline</DialogTitle>
          <DialogDescription>
            {data?.alert
              ? `${data.alert.category.toUpperCase()} · ${data.alert.status}`
              : 'Loading…'}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <ol className="space-y-3">
            {(data?.events ?? []).map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="font-medium">{e.event_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.actor_name ? `${e.actor_name} · ` : ''}
                    {new Date(e.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Mass-siren composer
// ---------------------------------------------------------------------------

const BROADCAST_CATEGORIES: BroadcastCategory[] = [
  'fire',
  'gas',
  'evacuation',
  'security',
  'weather',
  'general',
];

function SirenDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const { addToast } = useToast();
  const create = useCreateBroadcast();
  const [category, setCategory] = useState<BroadcastCategory>('fire');
  const [audience, setAudience] = useState<
    'all' | 'owners' | 'tenants' | 'staff'
  >('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  function submit(): void {
    create.mutate(
      { category, title: title.trim(), message: message.trim(), audience },
      {
        onSuccess: (res) => {
          addToast({
            title: 'Siren sent',
            description: `Alerted ${res.data.recipient_count} people`,
            variant: 'success',
          });
          setTitle('');
          setMessage('');
          onClose();
        },
        onError: (e) =>
          addToast({
            title: 'Failed to send',
            description: friendlyError(e),
            variant: 'destructive',
          }),
      },
    );
  }

  const selectClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Siren className="h-5 w-5" />
            Send mass siren
          </DialogTitle>
          <DialogDescription>
            An urgent alert to every targeted resident — push + in-app siren.
            Use only for genuine emergencies.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <select
                className={selectClass}
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as BroadcastCategory)
                }
              >
                {BROADCAST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Audience</Label>
              <select
                className={selectClass}
                value={audience}
                onChange={(e) =>
                  setAudience(
                    e.target.value as 'all' | 'owners' | 'tenants' | 'staff',
                  )
                }
              >
                {['all', 'owners', 'tenants', 'staff'].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fire in Block B — evacuate now"
              maxLength={150}
            />
          </div>
          <div className="space-y-1">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Clear instructions for residents…"
              rows={4}
              maxLength={2000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={create.isPending || !title.trim() || !message.trim()}
          >
            <Siren className="mr-2 h-4 w-4" />
            Send siren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
