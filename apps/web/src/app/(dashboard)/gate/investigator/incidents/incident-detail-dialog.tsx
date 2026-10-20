'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { friendlyError } from '@/lib/api-error';
import type { GateIncident } from '@/hooks/use-gate-incidents';
import { indiaDateTime } from '../register-kit';

function Field({ label, value }: { label: string; value: string | null | undefined }): ReactNode {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value || '—'}</dd>
    </div>
  );
}

// Photos are this society's uploads (the API checks); only https links render.
const safePhotos = (urls: readonly string[]): string[] => urls.filter((url) => url.startsWith('https://'));

interface IncidentDetailDialogProps {
  incident: GateIncident | null;
  canClose: boolean;
  onClose: () => void;
  closeIncident: (remark: string) => Promise<unknown>;
}

/** View on an incident (GATE-S7): the detail, its photos and Close Incident with a remark. */
export function IncidentDetailDialog({ incident, canClose, onClose, closeIncident }: IncidentDetailDialogProps): ReactNode {
  return (
    <Dialog open={incident !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {incident && <IncidentDetail incident={incident} canClose={canClose} onClose={onClose} closeIncident={closeIncident} />}
      </DialogContent>
    </Dialog>
  );
}

function IncidentDetail({ incident, canClose, onClose, closeIncident }: IncidentDetailDialogProps & { incident: GateIncident }): ReactNode {
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const open = incident.status === 'open';

  async function submit(): Promise<void> {
    if (remark.trim().length < 5) {
      setError('The closing remark is at least 5 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await closeIncident(remark.trim());
      onClose();
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Incident {incident.incident_no} · {incident.category_name}
        </DialogTitle>
      </DialogHeader>
      <dl className="mt-4 space-y-2">
        <Field label="Incident Date" value={indiaDateTime(incident.occurred_at)} />
        <Field label="Description" value={incident.description} />
        <Field label="Gate" value={incident.gate_name} />
        <Field label="Unit" value={[incident.block, incident.unit_number].filter(Boolean).join('-')} />
        <Field label="Raised By" value={incident.raised_by_name} />
        <Field label="Status" value={open ? 'Open' : 'Closed'} />
        {!open && <Field label="Closed By" value={incident.closed_by_name} />}
        {!open && <Field label="Closing Remark" value={incident.closing_remark} />}
      </dl>
      {safePhotos(incident.photo_urls).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {safePhotos(incident.photo_urls).map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Incident photo" className="h-24 w-24 rounded object-cover" />
            </a>
          ))}
        </div>
      )}
      {open && canClose && (
        <div className="mt-4 space-y-2">
          <Label htmlFor="closing-remark">Closing remark</Label>
          <Textarea id="closing-remark" maxLength={500} value={remark} onChange={(event) => setRemark(event.target.value)} />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        {open && canClose && (
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? 'Closing…' : 'Close Incident'}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
