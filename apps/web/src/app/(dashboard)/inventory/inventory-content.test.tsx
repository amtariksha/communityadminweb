import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryContent } from './inventory-content';

/**
 * "Create PO" and "Create Work Order" set `poOpen` / `woOpen`, but no
 * dialog was bound to either flag, so the buttons did nothing. The Add
 * Material dialog also had no Unit Price input, so every material was
 * saved at 0 and the catalogue's Unit Price column never showed a value.
 * The Issue LOI dialog posted its form as-is, so an untouched "Valid
 * Until" went out as '' and the API refused the whole LOI.
 */

const mocks = vi.hoisted(() => {
  const mutation = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  });
  const query = (data: unknown) => () => ({ data, isLoading: false });
  return {
    addToast: vi.fn(),
    createMaterial: mutation(),
    createPO: mutation(),
    createWO: mutation(),
    createLOI: mutation(),
    other: mutation(),
    query,
  };
});

vi.mock('@/hooks', () => ({
  useMaterials: mocks.query([]),
  useLOIs: mocks.query([]),
  useInventoryPurchaseOrders: mocks.query([]),
  useGRNs: mocks.query([]),
  useWorkOrders: mocks.query([]),
  useStockLogs: mocks.query([]),
  useStaffEmployees: mocks.query({
    data: [{ id: 'staff-1', name: 'Ravi Kumar', designation: 'Electrician' }],
  }),
  useCreateMaterial: () => mocks.createMaterial,
  useCreateInventoryPurchaseOrder: () => mocks.createPO,
  useCreateWorkOrder: () => mocks.createWO,
  useCreateLOI: () => mocks.createLOI,
  useConvertLOIToPO: () => mocks.other,
  useCreateGRN: () => mocks.other,
  useRecordStockMovement: () => mocks.other,
}));

vi.mock('@/hooks/use-inventory-list', () => ({
  useMaterialList: () => ({ data: { data: [], total: 0 }, isLoading: false }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: mocks.addToast }),
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

function type(label: RegExp, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function openDialog(tab: RegExp | null, button: RegExp, title: string): HTMLElement {
  if (tab) fireEvent.click(screen.getByRole('button', { name: tab }));
  fireEvent.click(screen.getByRole('button', { name: button }));
  const heading = screen.getByRole('heading', { name: title });
  return heading.closest('dialog') as HTMLElement;
}

describe('InventoryContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create PO', () => {
    it('opens a dialog and creates the purchase order', async () => {
      render(<InventoryContent />);
      const dialog = openDialog(/purchase orders/i, /create po/i, 'Create Purchase Order');

      type(/vendor \/ supplier name/i, 'Acme Electricals');
      type(/total amount/i, '15000');
      type(/tax amount/i, '2700');
      type(/expected delivery/i, '2026-11-05');
      type(/notes/i, 'LED panels for Tower B');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create PO' }));

      await waitFor(() => expect(mocks.createPO.mutateAsync).toHaveBeenCalledTimes(1));
      expect(mocks.createPO.mutateAsync).toHaveBeenCalledWith({
        vendor_name: 'Acme Electricals',
        total_amount: 15000,
        tax_amount: 2700,
        delivery_date: '2026-11-05',
        notes: 'LED panels for Tower B',
      });
      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'Create Purchase Order' })).toBeNull(),
      );
    });

    it('leaves out a blank delivery date, which the API would reject', async () => {
      render(<InventoryContent />);
      const dialog = openDialog(/purchase orders/i, /create po/i, 'Create Purchase Order');

      type(/vendor \/ supplier name/i, 'Acme Electricals');
      type(/total amount/i, '500');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create PO' }));

      await waitFor(() => expect(mocks.createPO.mutateAsync).toHaveBeenCalledTimes(1));
      const payload = mocks.createPO.mutateAsync.mock.calls[0][0];
      expect(payload.delivery_date).toBeUndefined();
      expect(payload.notes).toBeUndefined();
    });

    it('keeps the dialog open and says so when the save fails', async () => {
      mocks.createPO.mutateAsync.mockRejectedValueOnce(new Error('boom'));
      render(<InventoryContent />);
      const dialog = openDialog(/purchase orders/i, /create po/i, 'Create Purchase Order');

      type(/vendor \/ supplier name/i, 'Acme Electricals');
      type(/total amount/i, '500');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create PO' }));

      await waitFor(() =>
        expect(mocks.addToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' }),
        ),
      );
      expect(screen.getByRole('heading', { name: 'Create Purchase Order' })).toBeTruthy();
    });
  });

  describe('Create Work Order', () => {
    it('opens a dialog and creates the work order', async () => {
      render(<InventoryContent />);
      const dialog = openDialog(/work orders/i, /create work order/i, 'Create Work Order');

      type(/work order title/i, 'Replace Tower B lift contactor');
      type(/assigned to/i, 'Ravi Kumar');
      type(/materials used/i, '3');
      type(/estimated cost/i, '4200');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create Work Order' }));

      await waitFor(() => expect(mocks.createWO.mutateAsync).toHaveBeenCalledTimes(1));
      expect(mocks.createWO.mutateAsync).toHaveBeenCalledWith({
        title: 'Replace Tower B lift contactor',
        category: 'Maintenance',
        assigned_to: 'Ravi Kumar',
        materials_used: 3,
        cost: 4200,
      });
    });

    it('sends no assignee when none is picked', async () => {
      render(<InventoryContent />);
      const dialog = openDialog(/work orders/i, /create work order/i, 'Create Work Order');

      type(/work order title/i, 'Repaint parking bay lines');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create Work Order' }));

      await waitFor(() => expect(mocks.createWO.mutateAsync).toHaveBeenCalledTimes(1));
      expect(mocks.createWO.mutateAsync.mock.calls[0][0].assigned_to).toBeUndefined();
    });
  });

  describe('Add Material', () => {
    it('has a Unit Price input and sends what was typed', async () => {
      render(<InventoryContent />);
      const dialog = openDialog(null, /add material/i, 'Add Material to Catalogue');

      type(/material name/i, '9W LED bulb');
      // ASSET-11: the vendor is asked for, and the usual quantity to order.
      type(/vendor name/i, 'Vendor A');
      type(/re-order quantity/i, '20');
      type(/cost per unit/i, '45.5');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save Material' }));

      await waitFor(() => expect(mocks.createMaterial.mutateAsync).toHaveBeenCalledTimes(1));
      expect(mocks.createMaterial.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: '9W LED bulb', unit_price: 45.5, vendor_name: 'Vendor A', reorder_quantity: 20 }),
      );
    });
  });

  describe('Issue LOI', () => {
    function fillRequired(dialog: HTMLElement): void {
      const [vendor, title] = within(dialog).getAllByRole('textbox');
      fireEvent.change(vendor, { target: { value: 'Otis Elevators' } });
      fireEvent.change(title, { target: { value: 'Lift modernisation — Tower A' } });
    }

    it('leaves out a blank Valid Until and blank deliverables', async () => {
      render(<InventoryContent />);
      const dialog = openDialog(/letters of intent/i, /issue loi/i, 'Issue Letter of Intent (LOI)');

      fillRequired(dialog);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Issue LOI' }));

      await waitFor(() => expect(mocks.createLOI.mutateAsync).toHaveBeenCalledTimes(1));
      const payload = mocks.createLOI.mutateAsync.mock.calls[0][0];
      expect(payload.valid_until).toBeUndefined();
      expect(payload.deliverables).toBeUndefined();
      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'Issue Letter of Intent (LOI)' })).toBeNull(),
      );
    });

    it('sends the chosen date and an estimated value with paise', async () => {
      render(<InventoryContent />);
      const dialog = openDialog(/letters of intent/i, /issue loi/i, 'Issue Letter of Intent (LOI)');

      fillRequired(dialog);
      fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '125000.75' } });
      fireEvent.change(dialog.querySelector('input[type="date"]') as HTMLInputElement, {
        target: { value: '2026-12-31' },
      });
      fireEvent.change(within(dialog).getAllByRole('textbox')[2], {
        target: { value: 'Two VVVF drives' },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Issue LOI' }));

      await waitFor(() => expect(mocks.createLOI.mutateAsync).toHaveBeenCalledTimes(1));
      expect(mocks.createLOI.mutateAsync).toHaveBeenCalledWith({
        vendor: 'Otis Elevators',
        title: 'Lift modernisation — Tower A',
        estimated_value: 125000.75,
        valid_until: '2026-12-31',
        deliverables: 'Two VVVF drives',
      });
    });
  });
});
