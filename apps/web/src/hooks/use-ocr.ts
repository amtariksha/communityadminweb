'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceOcrResult {
  vendor_name: string | null;
  vendor_gstin: string | null;
  vendor_pan: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  gst_amount: number | null;
  total_amount: number | null;
  line_items: Array<{
    description: string;
    quantity: number | null;
    rate: number | null;
    amount: number;
    gst_rate: number | null;
  }>;
  bank_details: {
    bank_name: string | null;
    account_number: string | null;
    ifsc: string | null;
  } | null;
  raw_text: string;
  confidence: number;
}

export interface MeterReadingOcrResult {
  reading_value: number | null;
  meter_number: string | null;
  unit: string | null;
  confidence: number;
  raw_text: string;
}

export interface IdDocumentOcrResult {
  document_type: string;
  name: string | null;
  document_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  father_name: string | null;
  confidence: number;
  raw_text: string;
}

export interface GenericOcrResult {
  text: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (data:image/jpeg;base64,)
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useOcrInvoice() {
  return useMutation({
    mutationFn: async function ocrInvoice(file: File) {
      const image = await fileToBase64(file);
      const res = await api.post<{ data: InvoiceOcrResult }>('/ocr/invoice', {
        image,
        mime_type: file.type,
      });
      return res.data;
    },
  });
}

export function useOcrMeterReading() {
  return useMutation({
    mutationFn: async function ocrMeter(file: File) {
      const image = await fileToBase64(file);
      const res = await api.post<{ data: MeterReadingOcrResult }>(
        '/ocr/meter-reading',
        { image, mime_type: file.type },
      );
      return res.data;
    },
  });
}

export function useOcrIdDocument() {
  return useMutation({
    mutationFn: async function ocrId(file: File) {
      const image = await fileToBase64(file);
      const res = await api.post<{ data: IdDocumentOcrResult }>(
        '/ocr/id-document',
        { image, mime_type: file.type },
      );
      return res.data;
    },
  });
}

export function useOcrText() {
  return useMutation({
    mutationFn: async function ocrText(file: File) {
      const image = await fileToBase64(file);
      const res = await api.post<{ data: GenericOcrResult }>('/ocr/extract', {
        image,
        mime_type: file.type,
        type: 'text',
      });
      return res.data;
    },
  });
}
