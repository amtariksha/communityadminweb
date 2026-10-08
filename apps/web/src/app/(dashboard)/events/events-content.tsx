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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useEventRsvps,
  type EventItem,
  type CreateEventInput,
} from '@/hooks';
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
  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();

  const { data: rsvps = [], isLoading: isRsvpsLoading } = useEventRsvps(
    selectedEventForRsvps?.id ?? '',
  );

  // Form State
  const [formData, setFormData] = useState<CreateEventInput>({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '18:00',
    end_time: '20:00',
    location: 'Community Clubhouse',
    max_attendees: null,
    target_audience: 'all',
    status: 'published',
  });

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      event_date: new Date().toISOString().split('T')[0],
      start_time: '18:00',
      end_time: '20:00',
      location: 'Community Clubhouse',
      max_attendees: null,
      target_audience: 'all',
      status: 'published',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (event: EventItem) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description ?? '',
      event_date: event.event_date,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location ?? '',
      max_attendees: event.max_attendees,
      target_audience: event.target_audience,
      status: event.status,
    });
    setIsCreateOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.event_date) {
      toast({
        title: 'Validation Error',
        description: 'Please provide event title and valid date.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingEvent) {
        await updateEventMutation.mutateAsync({
          id: editingEvent.id,
          data: formData,
        });
        toast({ title: 'Event Updated', description: 'Changes saved successfully.' });
      } else {
        await createEventMutation.mutateAsync(formData);
        toast({ title: 'Event Created', description: 'New community event published.' });
      }
      setIsCreateOpen(false);
    } catch {
      toast({
        title: 'Operation Failed',
        description: 'Could not save event details.',
        variant: 'destructive',
      });
    }
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
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate">{event.location}</span>
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

      {/* Create / Edit Event Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveEvent}>
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Community Event'}</DialogTitle>
              <DialogDescription>
                Publish festival celebrations, sports events, or society general meetings.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="event-title">Event Title *</Label>
                <Input
                  id="event-title"
                  placeholder="e.g. Diwali Mela & Cultural Evening"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="event-date">Date (YYYY-MM-DD) *</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event-location">Venue / Location</Label>
                  <Input
                    id="event-location"
                    placeholder="Clubhouse Main Lawn"
                    value={formData.location ?? ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start-time">Start Time *</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-time">End Time *</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="max-attendees">Max Capacity (Optional)</Label>
                  <Input
                    id="max-attendees"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={formData.max_attendees ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_attendees: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="target-audience">Target Audience</Label>
                  <select
                    id="target-audience"
                    value={formData.target_audience}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_audience: e.target.value as CreateEventInput['target_audience'],
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  >
                    <option value="all">All Society Residents</option>
                    <option value="tower">Tower Specific</option>
                    <option value="floor">Floor Specific</option>
                    <option value="members_only">Owners Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event-status">Publication Status</Label>
                <select
                  id="event-status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as CreateEventInput['status'],
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  <option value="published">Published (Visible in Resident App)</option>
                  <option value="draft">Draft (Admin Only)</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event-desc">Event Description & Instructions</Label>
                <Textarea
                  id="event-desc"
                  rows={3}
                  placeholder="Detail dress code, chief guests, refreshment coupons, etc."
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending || updateEventMutation.isPending}>
                {editingEvent ? 'Save Changes' : 'Publish Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
