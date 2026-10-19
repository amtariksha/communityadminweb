'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  useCreateEmergencyContact,
  useUpdateEmergencyContact,
  type EmergencyContact,
} from '@/hooks';

type Category = EmergencyContact['category'];

interface ContactForm {
  name: string;
  phone: string;
  category: Category;
  address: string;
  available_24_7: boolean;
}

function formFor(contact: EmergencyContact | null): ContactForm {
  return {
    name: contact?.name ?? '',
    phone: contact?.phone ?? '',
    category: contact?.category ?? 'hospital',
    address: contact?.address ?? '',
    available_24_7: contact?.available_24_7 ?? true,
  };
}

/**
 * Add or edit one of the society's emergency numbers. Residents (app and
 * web) and guards read these (PROF-01), so an edit reaches them on their
 * next load. Mount with `key` = the contact id so the form starts fresh.
 */
export function EmergencyContactDialog({
  open,
  contact,
  onClose,
}: {
  open: boolean;
  /** The number being edited, or null to add one. */
  contact: EmergencyContact | null;
  onClose: () => void;
}): ReactNode {
  const { addToast } = useToast();
  const createContact = useCreateEmergencyContact();
  const updateContact = useUpdateEmergencyContact();
  const [form, setForm] = useState<ContactForm>(() => formFor(contact));
  const set = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      addToast({
        title: 'Validation Error',
        description: 'Please provide contact name and phone number.',
        variant: 'destructive',
      });
      return;
    }
    const data = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      category: form.category,
      address: form.address.trim() || null,
      available_24_7: form.available_24_7,
    };
    try {
      if (contact) {
        await updateContact.mutateAsync({ id: contact.id, data });
        addToast({ title: 'Emergency Contact Updated', description: 'Residents and guards now see the new details.' });
      } else {
        await createContact.mutateAsync(data);
        addToast({ title: 'Emergency Contact Saved', description: 'Added to emergency directory.' });
      }
      onClose();
    } catch {
      addToast({
        title: 'Operation Failed',
        description: contact ? 'Could not update emergency contact.' : 'Could not create emergency contact.',
        variant: 'destructive',
      });
    }
  }

  const busy = createContact.isPending || updateContact.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{contact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}</DialogTitle>
            <DialogDescription>
              Emergency desk numbers for ambulance, police, fire, or gate security.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4 text-sm">
            <div className="space-y-1.5">
              <Label htmlFor="em-name">Contact / Authority Name *</Label>
              <Input
                id="em-name"
                placeholder="e.g. City Hospital Emergency"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="em-phone">Phone Number *</Label>
                <Input
                  id="em-phone"
                  placeholder="102 or +91 11 2345 6789"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="em-cat">Emergency Type</Label>
                <select
                  id="em-cat"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value as Category)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  <option value="hospital">Hospital</option>
                  <option value="ambulance">Ambulance</option>
                  <option value="police">Police</option>
                  <option value="fire">Fire Brigade</option>
                  <option value="internal">Society Security Gate</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="em-addr">Hospital / Station Address</Label>
              <Input
                id="em-addr"
                placeholder="Sector 12, Main Road (1.5 km away)"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2" htmlFor="em-247">
              <input
                id="em-247"
                type="checkbox"
                checked={form.available_24_7}
                onChange={(e) => set('available_24_7', e.target.checked)}
              />
              Available 24×7
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {contact ? 'Save Changes' : 'Save Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
