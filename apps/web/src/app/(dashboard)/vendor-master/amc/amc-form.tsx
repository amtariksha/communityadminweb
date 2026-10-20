'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { useToast } from '@/components/ui/toast';
import { useCreateAmc, useRenewAmc, useUpdateAmcContract, type AmcContractDetail } from '@/hooks/use-amc-contracts';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { AddVendorDialog } from '../../vendors/vendor-form-dialog';
import { AddCategoryDialog } from './add-category-dialog';
import { AmcBasicFields } from './amc-basic-fields';
import { AmcFiles, useAmcFileQueue } from './amc-files';
import { amcFormError, amcFormValues, amcPayload, renewalValues, type AmcFormValues } from './amc-form-values';
import { AmcScheduleFields } from './amc-schedule-fields';

export interface AmcFormProps {
  mode: FormMode;
  /** Edit this contract. */
  contract?: AmcContractDetail | null;
  /** Renew this ended contract: a new one, pre-filled for the next period (VEND-S6). */
  renewFrom?: AmcContractDetail | null;
  open?: boolean;
  onClose: () => void;
  onSaved: (contract: AmcContractDetail) => void;
}

function initialValues(props: AmcFormProps): AmcFormValues {
  if (props.renewFrom) return renewalValues(props.renewFrom);
  return amcFormValues(props.contract);
}

function useSaveContract(props: AmcFormProps) {
  const create = useCreateAmc();
  const update = useUpdateAmcContract();
  const renew = useRenewAmc();
  const save = (values: AmcFormValues): Promise<{ data: AmcContractDetail }> => {
    const body = amcPayload(values);
    if (props.contract) return update.mutateAsync({ id: props.contract.id, ...body });
    if (props.renewFrom) return renew.mutateAsync({ id: props.renewFrom.id, ...body });
    return create.mutateAsync(body);
  };
  return { save, saving: create.isPending || update.isPending || renew.isPending };
}

/**
 * Create Contract / Edit / Renew (VEND-S8, VEND-11): Basic Details, the
 * optional Payment and Service schedules and the files, as a page in the
 * classic layout and a dialog on the standard Assets page. "+ Add Vendor"
 * and "+ Add Asset Category" open over the form and come back to it with
 * the new choice selected and everything typed kept.
 */
export function AmcForm(props: AmcFormProps): ReactNode {
  const { addToast } = useToast();
  const [values, setValues] = useState<AmcFormValues>(() => initialValues(props));
  const [adding, setAdding] = useState<'vendor' | 'category' | null>(null);
  const files = useAmcFileQueue();
  const { save, saving } = useSaveContract(props);
  const set = (patch: Partial<AmcFormValues>): void => setValues((current) => ({ ...current, ...patch }));

  async function submit(): Promise<void> {
    const problem = amcFormError(values);
    if (problem) return addToast({ title: 'Check the contract', description: problem, variant: 'destructive' });
    try {
      const saved = await save(values);
      const failed = await files.uploadAll(saved.data.id);
      if (failed > 0) addToast({ title: `${failed} file(s) could not be uploaded`, description: 'Open the contract to add them again.', variant: 'destructive' });
      addToast({ title: props.contract ? 'Contract updated' : 'Contract saved', variant: 'success' });
      props.onSaved(saved.data);
    } catch (error) {
      const description = isNotDeployed(error) ? 'This is not available yet.' : friendlyError(error);
      addToast({ title: 'Could not save the contract', description, variant: 'destructive' });
    }
  }

  const title = props.contract ? 'Edit Contract' : props.renewFrom ? 'Renew Contract' : 'New Contract';
  return (
    <>
      <FormFrame mode={props.mode} open={props.open} title={title} onClose={props.onClose} onSave={() => void submit()} saving={saving} dialogClassName="max-w-2xl">
        <div className="space-y-6">
          <AmcBasicFields values={values} set={set} onAddVendor={() => setAdding('vendor')} onAddCategory={() => setAdding('category')} />
          <AmcScheduleFields kind="payment" values={values} set={set} />
          <AmcScheduleFields kind="service" values={values} set={set} />
          <AmcFiles queue={files} contractId={props.contract?.id} onProblem={(message) => addToast({ title: message, variant: 'destructive' })} />
        </div>
      </FormFrame>
      <AddVendorDialog
        open={adding === 'vendor'}
        onOpenChange={(open) => setAdding(open ? 'vendor' : null)}
        onCreated={(vendor) => set({ vendorId: vendor.id, vendorName: vendor.name })}
      />
      <AddCategoryDialog open={adding === 'category'} onClose={() => setAdding(null)} onAdded={(categoryId) => set({ categoryId, assetIds: [] })} />
    </>
  );
}
