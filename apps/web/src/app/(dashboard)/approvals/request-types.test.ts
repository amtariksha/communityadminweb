import { describe, expect, it } from 'vitest';
import { formatRequestType, REQUEST_TYPE_OPTIONS } from './request-types';

describe('approval request types', () => {
  it('names violations and offers them in the Type filter (RULE-04)', () => {
    expect(formatRequestType('violation')).toBe('Violation');
    expect(REQUEST_TYPE_OPTIONS).toContainEqual({ value: 'violation', label: 'Violation' });
  });
});
