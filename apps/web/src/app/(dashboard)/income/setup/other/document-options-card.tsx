'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Save, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useSaveDocumentSettings, type DocumentSettings } from '@/hooks/use-billing-documents';
import { friendlyError } from '@/lib/api-error';
import { optionsErrors, readOptions, sameOptions, toOptionsPayload, type OptionsForm } from './document-options';
import { ExcludedBanks } from './excluded-banks';
import { OptionsFields } from './options-fields';

interface DocumentOptionsCardProps {
  view: DocumentSettings;
  canWrite: boolean;
}

/**
 * Setup › Other's document options (INC-42): the names printed on each
 * ledger's documents, whether dues are published to residents, interest
 * breakup and logo, the payment instructions and the bank accounts left out
 * of them. Saved through PUT /billing-documents/settings with these fields.
 */
export function DocumentOptionsCard({ view, canWrite }: DocumentOptionsCardProps): ReactNode {
  const { addToast } = useToast();
  const save = useSaveDocumentSettings();
  const saved = readOptions(view.stored);
  const savedKey = JSON.stringify(saved);
  const [form, setForm] = useState<OptionsForm>(saved);

  useEffect(() => {
    setForm(saved);
    // savedKey captures every field of `saved`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const errors = optionsErrors(form);
  const canSave = canWrite && !sameOptions(form, saved) && Object.keys(errors).length === 0 && !save.isPending;

  function change(patch: Partial<OptionsForm>): void {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function submit(): Promise<void> {
    try {
      await save.mutateAsync(toOptionsPayload(form, view.stored.payment_instructions_html));
      addToast({ title: 'Document options saved', description: 'New documents carry them.', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save document options', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <Card id="document-options">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Document options
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Names and payment instructions printed on invoices and receipts. When dues are not published, residents do not
          see their dues amounts in the app.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <OptionsFields form={form} errors={errors} change={change} disabled={!canWrite} />
        <ExcludedBanks excluded={form.excluded} change={(excluded) => change({ excluded })} disabled={!canWrite} />
        {canWrite && (
          <Button onClick={() => void submit()} disabled={!canSave}>
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
