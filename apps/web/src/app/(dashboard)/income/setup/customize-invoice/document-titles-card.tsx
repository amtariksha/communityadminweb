'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useDocumentSettings, useSaveDocumentSettings } from '@/hooks/use-billing-documents';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { canChangeSettings } from '../../../settings/settings-access';
import { readTitles, sameTitles, titlesErrors, toTitlesPayload, type TitlesField, type TitlesForm } from './document-titles';
import { TitlesFields } from './titles-fields';

function Shell({ children }: { children: ReactNode }): ReactNode {
  return (
    <Card id="document-titles">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document titles &amp; issuer
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          The title, issuer block and receipts history printed on invoices, receipts and credit notes. Blank address
          fields print the society&apos;s own address.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

/**
 * Setup › Customize Invoice › Document titles & issuer (INC-39): saved by
 * the community admin through PUT /billing-documents/settings with this
 * card's fields only; other finance roles see the values.
 */
export function DocumentTitlesCard(): ReactNode {
  const { addToast } = useToast();
  const query = useDocumentSettings();
  const save = useSaveDocumentSettings();
  const canWrite = canChangeSettings();
  const saved = readTitles(query.data?.stored);
  const savedKey = JSON.stringify(saved);
  const [form, setForm] = useState<TitlesForm>(saved);

  useEffect(() => {
    setForm(saved);
    // savedKey captures every field of `saved`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  if (isNotDeployed(query.error)) {
    return <Shell><p className="text-sm text-muted-foreground">Document titles are not available yet on this server.</p></Shell>;
  }
  if (query.error) return <Shell><p role="alert" className="text-sm text-destructive">{friendlyError(query.error)}</p></Shell>;
  if (query.isLoading) return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;

  const errors = titlesErrors(form);
  const canSave = canWrite && !sameTitles(form, saved) && Object.keys(errors).length === 0 && !save.isPending;

  function change(field: TitlesField, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(): Promise<void> {
    try {
      await save.mutateAsync(toTitlesPayload(form));
      addToast({ title: 'Document titles saved', description: 'New invoices, receipts and credit notes carry them.', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save document titles', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <Shell>
      <TitlesFields form={form} errors={errors} change={change} disabled={!canWrite} />
      {canWrite ? (
        <Button onClick={() => void submit()} disabled={!canSave}>
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? 'Saving…' : 'Save document titles'}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Only the society&apos;s community admin can change these.</p>
      )}
    </Shell>
  );
}
