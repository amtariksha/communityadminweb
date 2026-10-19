import { describe, expect, it } from 'vitest';
import type { Asset } from '@/hooks/use-assets';
import { assetFormValues, assetPayload } from './asset-form-fields';
import { assetQrValue } from './asset-qr-dialog';

/** ASSET-13 — the asset form's code and detailed location, and what the QR badge encodes. */
describe('asset form code and location', () => {
  it('leaves a blank code out (the API numbers the asset) and sends the location parts', () => {
    const values = { ...assetFormValues(), name: 'Lift A', location: 'Tower A', building: ' Block C ', floor: 'G' };
    expect(assetPayload(values)).toMatchObject({ asset_code: undefined, site: null, building: 'Block C', wing: null, floor: 'G', room: null });
    expect(assetPayload({ ...values, assetCode: ' DG-01 ' }).asset_code).toBe('DG-01');
  });

  it('opens a stored asset with its code and location', () => {
    const values = assetFormValues({ id: 'a-1', name: 'DG', asset_code: 'AST-0007', site: 'Phase 1', room: 'DG room' } as Asset);
    expect(values).toMatchObject({ assetCode: 'AST-0007', site: 'Phase 1', room: 'DG room', wing: '' });
  });

  it('encodes the QR value (the code), not the internal id; an older asset keeps today’s value', () => {
    expect(assetQrValue({ id: 'a-1', name: 'Lift', qr_code: 'AST-0001', asset_code: 'LIFT-A' })).toBe('AST-0001');
    expect(assetQrValue({ id: 'a-1', name: 'Lift', qr_code: null, asset_code: 'LIFT-A' })).toBe('LIFT-A');
    expect(assetQrValue({ id: 'a-1', name: 'Lift', qr_code: null, asset_code: null })).toBe('ASSET:a-1:Lift');
  });
});
