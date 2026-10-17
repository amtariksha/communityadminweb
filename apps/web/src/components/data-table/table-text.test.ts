import { describe, expect, it } from 'vitest';
import {
  exportFileName,
  printableTable,
  serialNumber,
  showingText,
  toTsv,
  withCount,
  type TextColumn,
} from './table-text';

interface Row {
  number: string;
  note: string;
}

const COLUMNS: TextColumn<Row>[] = [
  { header: 'Request No.', text: (row) => row.number },
  { header: 'Request', text: (row) => row.note },
];

describe('serialNumber', () => {
  it('continues across pages', () => {
    expect(serialNumber(1, 100, 0)).toBe(1);
    expect(serialNumber(2, 100, 0)).toBe(101);
    expect(serialNumber(3, 25, 4)).toBe(55);
  });
});

describe('showingText', () => {
  it.each([
    [1, 25, 0, 'Showing 0 to 0 of 0 entries'],
    [1, 25, 60, 'Showing 1 to 25 of 60 entries'],
    [2, 25, 60, 'Showing 26 to 50 of 60 entries'],
    [3, 25, 60, 'Showing 51 to 60 of 60 entries'],
    [1, 100, 2300, 'Showing 1 to 100 of 2,300 entries'],
  ])('page %i of size %i over %i rows', (page, size, total, text) => {
    expect(showingText(page, size, total)).toBe(text);
  });
});

describe('withCount', () => {
  it('puts the count after the label', () => {
    expect(withCount('Plumbing', 4)).toBe('Plumbing (4)');
    expect(withCount('All', undefined)).toBe('All');
  });
});

describe('toTsv', () => {
  it('writes a header and one line per row, keeping each cell on its line', () => {
    const tsv = toTsv(COLUMNS, [
      { number: 'TKT-0001', note: 'Leak\nin kitchen' },
      { number: 'TKT-0002', note: 'Tab\there' },
    ], { serial: { page: 2, pageSize: 25 } });

    expect(tsv.split('\n')).toEqual([
      'S.No\tRequest No.\tRequest',
      '26\tTKT-0001\tLeak in kitchen',
      '27\tTKT-0002\tTab here',
    ]);
  });
});

describe('printableTable', () => {
  it('builds a plain table with every visible row and no markup from the data', () => {
    const html = printableTable('Open Requests', COLUMNS, [{ number: 'TKT-0001', note: '<b>loud</b>' }], {
      serial: { page: 1, pageSize: 25 },
    });

    expect(html).toContain('<h1>Open Requests</h1>');
    expect(html).toContain('<th>S.No</th><th>Request No.</th><th>Request</th>');
    expect(html).toContain('<td>1</td><td>TKT-0001</td><td>&lt;b&gt;loud&lt;/b&gt;</td>');
    expect(html).not.toContain('<b>loud</b>');
  });
});

describe('exportFileName', () => {
  it('names the file after the list and the day in India', () => {
    // 20:00 UTC on 17 Oct is already 18 Oct in India.
    expect(exportFileName('open-requests', 'xlsx', new Date('2026-10-17T20:00:00Z'))).toBe(
      'open-requests-2026-10-18.xlsx',
    );
  });
});
