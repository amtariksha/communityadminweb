import { describe, expect, it } from 'vitest';
import { wordFor } from './vocabulary';

describe('wordFor', () => {
  it('uses the committee’s words in classic', () => {
    expect(wordFor('classic', 'Tickets')).toBe('Requests');
    expect(wordFor('classic', 'New Ticket')).toBe('Create Request');
    expect(wordFor('classic', 'Record Receipt')).toBe('Post Collection');
  });

  it('leaves the standard layout exactly as written', () => {
    expect(wordFor('standard', 'Tickets')).toBe('Tickets');
  });

  it('passes through words without a classic entry', () => {
    expect(wordFor('classic', 'Invoices')).toBe('Invoices');
  });
});
