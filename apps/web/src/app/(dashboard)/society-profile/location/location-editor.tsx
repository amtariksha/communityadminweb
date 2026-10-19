'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useUpdateSocietyProfile, type SocietyProfile } from '@/hooks/use-society-profile';
import { friendlyError } from '@/lib/api-error';
import { locationChange, locationError, locationFromProfile, mapEmbedUrl, typedPoint, type LocationValues } from './location-form';

type Setter = (key: keyof LocationValues, value: string) => void;

function Field(props: { id: string; label: string; value: string; set: Setter; field: keyof LocationValues; readOnly: boolean; placeholder?: string; maxLength?: number }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        value={props.value}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        readOnly={props.readOnly}
        disabled={props.readOnly}
        onChange={(event) => props.set(props.field, event.target.value)}
      />
    </div>
  );
}

function AddressBlock({ values, set, readOnly }: { values: LocationValues; set: Setter; readOnly: boolean }): ReactNode {
  const field = (key: keyof LocationValues, label: string, extra: { placeholder?: string; maxLength?: number } = {}) => (
    <Field id={`profile-${key}`} label={label} value={values[key]} set={set} field={key} readOnly={readOnly} {...extra} />
  );
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Society Address</h3>
      {field('address', 'Address line 1', { maxLength: 255 })}
      {field('address_line2', 'Address line 2', { maxLength: 255 })}
      <div className="grid gap-3 sm:grid-cols-3">
        {field('city', 'City', { maxLength: 100 })}
        {field('state', 'State', { maxLength: 100 })}
        {field('pin_code', 'Pin Code', { maxLength: 6, placeholder: '560001' })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {field('phone', 'Phone', { maxLength: 20, placeholder: 'Landline or mobile' })}
        {field('builder_url', 'Builder Url', { placeholder: 'https://…' })}
      </div>
      <div className="space-y-1">
        <Label htmlFor="profile-amenities">Amenities</Label>
        <Textarea
          id="profile-amenities"
          rows={2}
          maxLength={500}
          readOnly={readOnly}
          disabled={readOnly}
          value={values.amenities_text}
          onChange={(event) => set('amenities_text', event.target.value)}
        />
      </div>
    </div>
  );
}

function LocationBlock({ values, set, readOnly }: { values: LocationValues; set: Setter; readOnly: boolean }): ReactNode {
  const [preview, setPreview] = useState(() => typedPoint(values));
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Society Location</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="profile-latitude" label="Latitude" value={values.latitude} set={set} field="latitude" readOnly={readOnly} placeholder="12.971599" />
        <Field id="profile-longitude" label="Longitude" value={values.longitude} set={set} field="longitude" readOnly={readOnly} placeholder="77.594566" />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setPreview(typedPoint(values))}>
        Preview Map
      </Button>
      {preview ? (
        <iframe title="Map preview" src={mapEmbedUrl(preview)} className="h-64 w-full rounded-md border" loading="lazy" />
      ) : (
        <p className="text-xs text-muted-foreground">Type a latitude and longitude, then Preview Map.</p>
      )}
    </div>
  );
}

/**
 * Society Profile › Location, editable by the community admin (PROF-20):
 * address, pin code, phone, builder site, amenities and the map point. The
 * society's name stays with the platform team; the geofence radius too.
 */
export function LocationEditor({ profile, canEdit }: { profile: SocietyProfile; canEdit: boolean }): ReactNode {
  const { addToast } = useToast();
  const update = useUpdateSocietyProfile();
  const [initial, setInitial] = useState(() => locationFromProfile(profile));
  const [values, setValues] = useState(initial);
  const set: Setter = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  function save(): void {
    const problem = locationError(values);
    if (problem) return addToast({ title: problem, variant: 'destructive' });
    const change = locationChange(initial, values);
    if (Object.keys(change).length === 0) return addToast({ title: 'Nothing has changed.' });
    update.mutate(change, {
      onSuccess(saved) {
        const loaded = locationFromProfile(saved);
        setInitial(loaded);
        setValues(loaded);
        addToast({ title: 'Location saved', variant: 'success' });
      },
      onError: (error) => addToast({ title: 'Could not save the location', description: friendlyError(error), variant: 'destructive' }),
    });
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <p className="text-sm text-muted-foreground">Society Name: {profile.name}</p>
        <AddressBlock values={values} set={set} readOnly={!canEdit} />
        <LocationBlock values={values} set={set} readOnly={!canEdit} />
        {canEdit ? (
          <div className="flex justify-end">
            <Button type="button" onClick={save} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Only the community admin can change the address and map location.</p>
        )}
      </CardContent>
    </Card>
  );
}
