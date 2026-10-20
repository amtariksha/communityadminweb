import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import { isNotDeployed, isRouteMissing } from './not-deployed';

describe('not deployed', () => {
  it('reads any 404 as not deployed', () => {
    expect(isNotDeployed(new ApiError(404, { statusCode: 404, error: 'Not Found', message: 'Cannot GET /x' } as never))).toBe(true);
    expect(isNotDeployed(new ApiError(400, { statusCode: 400, error: 'Bad Request', message: 'Bad' } as never))).toBe(false);
    expect(isNotDeployed(null)).toBe(false);
  });

  it('tells a missing route from a record the route could not find', () => {
    expect(isRouteMissing(new ApiError(404, { statusCode: 404, error: 'Not Found', message: 'Cannot POST /x' } as never))).toBe(true);
    expect(isRouteMissing(new ApiError(404, { statusCode: 404, error: 'Not Found', message: 'Payer not found', code: 'payer_not_found' } as never))).toBe(false);
    expect(isRouteMissing(new ApiError(409, { statusCode: 409, error: 'Conflict', message: 'Off' } as never))).toBe(false);
  });
});
