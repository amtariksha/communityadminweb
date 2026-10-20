'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  PartyPopper,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import {
  useEvents,
  useDeleteEvent,
  useEventRsvps,
  type EventItem,
} from '@/hooks';
import { EventForm } from './components/event-form';
import { formatDate } from '@/lib/utils';

type EventStatusTab = 'all' | 'published' | 'draft' | 'completed' | 'cancelled';

export function EventsContent() {
  const { addToast: toast } = useToast();
  const [activeTab, setActiveTab] = useState<EventStatusTab>('all');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [selectedEventForRsvps, setSelectedEventForRsvps] = useState<EventItem | null>(null);

  const { data: events = [], isLoading } = useEvents(activeTab, search);
  const deleteEventMutation = useDeleteEvent();

  const { data: rsvps = [], isLoading: isRsvpsLoading } = useEventRsvps(
    selectedEventForRsvps?.id ?? '',
  );

  // AMEN-12 — the form is EventForm (a dialog here, a page in classic).
  const handleOpenCreate = () => {
    setEditingEvent(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (event: EventItem) => {
    setEditingEvent(event);
    setIsCreateOpen(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to cancel and remove this event?')) return;
    try {
      await deleteEventMutation.mutateAsync(id);
      toast({ title: 'Event Deleted', description: 'Event removed from directory.' });
    } catch {
      toast({
        title: 'Failed to delete',
        description: 'Could not delete event.',
        variant: 'destructive',
      });
    }
  };

  const statusColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    published: 'default',
    ongoing: 'secondary',
    draft: 'outline',
    completed: 'secondary',
    cancelled: 'destructive',
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community Events & Lifestyle</h1>
          <p className="text-sm text-muted-foreground">
            Publish society festivals, workshops, sports tournaments, and track resident RSVPs.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {(['all', 'published', 'draft', 'completed', 'cancelled'] as EventStatusTab[]).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ),
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-28 bg-muted/40" />
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <PartyPopper className="h-12 w-12 text-muted-foreground/60 mb-3" />
          <CardTitle className="text-lg">No events found</CardTitle>
          <CardDescription className="max-w-sm mt-1">
            {search
              ? 'No events matched your search query. Try another keyword.'
              : 'There are no events registered in this status. Click "+ Create Event" to publish one.'}
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="flex flex-col overflow-hidden border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant={statusColors[event.status] ?? 'default'} className="capitalize">
                    {event.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded">
                    Audience: {event.target_audience.replace('_', ' ')}
                  </span>
                </div>
                <CardTitle className="line-clamp-1 text-lg mt-2">{event.title}</CardTitle>
                {event.description && (
                  <CardDescription className="line-clamp-2 text-xs">
                    {event.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex-1 space-y-2 pb-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>{formatDate(event.event_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {event.start_time} - {event.end_time}
                  </span>
                </div>
                {(event.amenity_name ?? event.location) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate">{event.amenity_name ?? event.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1 font-medium text-foreground">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {event.rsvp_going_count ?? 0} Confirmed Attending
                    {event.max_attendees ? ` / Max ${event.max_attendees}` : ''}
                  </span>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEventForRsvps(event)}
                  className="gap-1 text-xs"
                >
                  <Users className="h-3 w-3" />
                  RSVPs ({event.rsvp_going_count ?? 0})
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenEdit(event)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Event */}
      {isCreateOpen && (
        <EventForm
          key={editingEvent?.id ?? 'new'}
          mode="dialog"
          open
          event={editingEvent}
          onClose={() => setIsCreateOpen(false)}
          onSaved={() => setIsCreateOpen(false)}
        />
      )}

      {/* RSVP Attendees Drawer / Modal */}
      <Dialog
        open={!!selectedEventForRsvps}
        onOpenChange={(open) => !open && setSelectedEventForRsvps(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attendees & RSVPs</DialogTitle>
            <DialogDescription>
              {selectedEventForRsvps?.title} &bull;{' '}
              {selectedEventForRsvps && formatDate(selectedEventForRsvps.event_date)}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-2 py-2">
            {isRsvpsLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">
                Loading attendee register...
              </div>
            ) : rsvps.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No resident RSVPs recorded yet for this event.
              </div>
            ) : (
              rsvps.map((rsvp) => (
                <div
                  key={rsvp.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground text-sm">
                      {rsvp.member_name ?? 'Resident Member'}
                    </p>
                    <p className="text-muted-foreground">
                      Unit: {rsvp.unit_number ?? 'N/A'} {rsvp.member_phone ? `• ${rsvp.member_phone}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        rsvp.status === 'going'
                          ? 'default'
                          : rsvp.status === 'maybe'
                          ? 'outline'
                          : 'secondary'
                      }
                      className="capitalize"
                    >
                      {rsvp.status}
                    </Badge>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {rsvp.attendee_count} person{rsvp.attendee_count > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedEventForRsvps(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
