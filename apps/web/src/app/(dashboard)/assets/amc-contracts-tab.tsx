'use client';

import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAmcContract, type AmcContractRow } from '@/hooks/use-amc-contracts';
import { isNotDeployed } from '@/lib/not-deployed';
import { AmcForm } from '../vendor-master/amc/amc-form';
import { AmcList, type AmcView } from '../vendor-master/amc/amc-list';

type Editing = { kind: 'new' } | { kind: 'edit' | 'renew'; id: string } | null;

/** The open form: a new contract, or one loaded for Edit / Renew. */
function ContractDialog({ editing, onClose }: { editing: Editing; onClose: () => void }): ReactNode {
  const loaded = useAmcContract(editing && editing.kind !== 'new' ? editing.id : '');
  if (!editing) return null;
  if (editing.kind !== 'new' && isNotDeployed(loaded.error)) {
    return <p className="mt-2 text-sm text-muted-foreground">Editing and renewing contracts is not available yet.</p>;
  }
  if (editing.kind !== 'new' && !loaded.data) return null;
  return (
    <AmcForm
      key={editing.kind === 'new' ? 'new' : `${editing.kind}-${editing.id}-${loaded.dataUpdatedAt}`}
      mode="dialog"
      open
      contract={editing.kind === 'edit' ? loaded.data : null}
      renewFrom={editing.kind === 'renew' ? loaded.data : null}
      onClose={onClose}
      onSaved={onClose}
    />
  );
}

/**
 * Assets › AMC Contracts (standard layout): the same Active / Expired lists
 * and contract form as Vendor Master › AMCs (VEND-11), the form in a dialog.
 */
export function AmcContractsTab(): ReactNode {
  const [view, setView] = useState<AmcView>('active');
  const [editing, setEditing] = useState<Editing>(null);
  const edit = (row: AmcContractRow): void => setEditing({ kind: 'edit', id: row.id });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AMC Contracts</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant={view === 'active' ? 'default' : 'outline'} onClick={() => setView('active')}>Active</Button>
          <Button size="sm" variant={view === 'expired' ? 'default' : 'outline'} onClick={() => setView('expired')}>Expired</Button>
          <Button size="sm" onClick={() => setEditing({ kind: 'new' })}>
            <Plus className="mr-2 h-4 w-4" />
            Add AMC
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <AmcList key={view} view={view} onEdit={edit} onRenew={(row) => setEditing({ kind: 'renew', id: row.id })} />
        <ContractDialog editing={editing} onClose={() => setEditing(null)} />
      </CardContent>
    </Card>
  );
}
