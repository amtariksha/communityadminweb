'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useAmenities, useCreateEvent, useUpdateEvent, type EventItem } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { EventCoverField } from './event-cover-field';
import {
  AUDIENCE_OPTIONS,
  CLASS_TYPE_OPTIONS,
  eventFormValues,
  eventPayload,
  STATUS_OPTIONS,
  type EventFormValues,
} from './event-form-values';

const SELECT_CLASS = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm';

interface EventFormProps {
  mode: FormMode;
  /** The event to edit; none creates one. */
  event?: EventItem | null;
  /** Dialog only. */
  open?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface FieldsProps {
  values: EventFormValues;
  set: (patch: Partial<EventFormValues>) => void;
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function ClassVenueFields({ values, set }: FieldsProps): ReactNode {
  const amenities = (useAmenities().data?.data ?? []).filter((amenity) => amenity.is_active || amenity.id === values.amenityId);
  return (
    <>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Class type *</legend>
        <div className="flex gap-4">
          {CLASS_TYPE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="event-class-type" checked={values.classType === option.value} onChange={() => set({ classType: option.value })} />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field id="event-amenity" label="Facility">
          <select id="event-amenity" className={SELECT_CLASS} value={values.amenityId} onChange={(e) => set({ amenityId: e.target.value })}>
            <option value="">Not in an amenity</option>
            {amenities.map((amenity) => (
              <option key={amenity.id} value={amenity.id}>
                {amenity.name}
              </option>
            ))}
          </select>
        </Field>
        {!values.amenityId && (
          <Field id="event-location" label="Venue / Location">
            <Input id="event-location" placeholder="Clubhouse Main Lawn" value={values.location} maxLength={255} onChange={(e) => set({ location: e.target.value })} />
          </Field>
        )}
      </div>
      {values.amenityId && <p className="text-xs text-muted-foreground">The event takes these hours in the amenity: nobody can book it then.</p>}
    </>
  );
}

function WhenFields({ values, set }: FieldsProps): ReactNode {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field id="event-date" label={values.classType === 'regular' ? 'Start Date *' : 'Date *'}>
          <Input id="event-date" type="date" value={values.eventDate} onChange={(e) => set({ eventDate: e.target.value })} />
        </Field>
        {values.classType === 'regular' && (
          <Field id="event-end-date" label="End Date">
            <Input id="event-end-date" type="date" min={values.eventDate} value={values.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </Field>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field id="start-time" label="Start Time *">
          <Input id="start-time" type="time" value={values.startTime} onChange={(e) => set({ startTime: e.target.value })} />
        </Field>
        <Field id="end-time" label="End Time *">
          <Input id="end-time" type="time" value={values.endTime} onChange={(e) => set({ endTime: e.target.value })} />
        </Field>
      </div>
    </>
  );
}

function AudienceFields({ values, set }: FieldsProps): ReactNode {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field id="max-attendees" label="Max Capacity (Optional)">
          <Input id="max-attendees" type="number" min="1" placeholder="Unlimited" value={values.capacity} onChange={(e) => set({ capacity: e.target.value })} />
        </Field>
        <Field id="target-audience" label="Target Audience">
          <select id="target-audience" className={SELECT_CLASS} value={values.audience} onChange={(e) => set({ audience: e.target.value as EventFormValues['audience'] })}>
            {AUDIENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="event-status" label="Publication Status">
        <select id="event-status" className={SELECT_CLASS} value={values.status} onChange={(e) => set({ status: e.target.value as EventFormValues['status'] })}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}

/**
 * Add Event / Edit Event (SB-07, screen AMEN-S4): the /events dialog in the
 * standard layout, a page in classic (`/amenities/events/new`,
 * `/amenities/events/:id/edit`). The cover image is uploaded here; AMEN-23
 * adds the class type, the facility it is held in and a Regular class's end date.
 */
export function EventForm({ mode, event, open, onClose, onSaved }: EventFormProps): ReactNode {
  const { addToast } = useToast();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const [values, setValues] = useState<EventFormValues>(() => eventFormValues(event));
  const set = (patch: Partial<EventFormValues>) => setValues((current) => ({ ...current, ...patch }));

  async function save(): Promise<void> {
    const { payload, error } = eventPayload(values);
    if (!payload) {
      addToast({ title: error ?? 'Check the form', variant: 'destructive' });
      return;
    }
    try {
      if (event) await updateEvent.mutateAsync({ id: event.id, data: payload });
      else await createEvent.mutateAsync(payload);
      addToast({ title: event ? 'Event updated' : 'Event created', variant: 'success' });
      onSaved();
    } catch (failure) {
      addToast({ title: 'Could not save the event', description: friendlyError(failure), variant: 'destructive' });
    }
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title={event ? 'Edit Event' : mode === 'page' ? 'Add Event' : 'Create Community Event'}
      description="Publish festival celebrations, sports events, or society general meetings."
      onClose={onClose}
      onSave={() => void save()}
      saving={createEvent.isPending || updateEvent.isPending}
      saveLabel={event ? 'Save Changes' : mode === 'page' ? 'Add Event' : 'Publish Event'}
      dialogClassName="sm:max-w-lg"
    >
      <Field id="event-title" label="Event Name *">
        <Input id="event-title" placeholder="e.g. Diwali Mela & Cultural Evening" value={values.title} maxLength={255} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <EventCoverField value={values.coverImageUrl} onChange={(coverImageUrl) => set({ coverImageUrl })} />
      <ClassVenueFields values={values} set={set} />
      <WhenFields values={values} set={set} />
      <AudienceFields values={values} set={set} />
      <Field id="event-desc" label="Event Description & Instructions">
        <Textarea
          id="event-desc"
          rows={3}
          maxLength={3000}
          placeholder="Detail dress code, chief guests, refreshment coupons, etc."
          value={values.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
    </FormFrame>
  );
}
