import {describe, expect, it} from 'vitest';
import {buildOrderSearchQuery, parseOrderFilters} from './orderFilters';

describe('buildOrderSearchQuery', () => {
  it('returns undefined when no filters are set', () => {
    expect(buildOrderSearchQuery({})).toBeUndefined();
  });

  it('strips the leading # from order names', () => {
    expect(buildOrderSearchQuery({name: '#1001'})).toBe('name:1001');
  });

  it('joins multiple filters with AND', () => {
    expect(
      buildOrderSearchQuery({name: '1001', confirmationNumber: 'ABC123'}),
    ).toBe('name:1001 AND confirmation_number:ABC123');
  });

  it('sanitizes injection attempts', () => {
    expect(buildOrderSearchQuery({name: '1001 OR admin:1'})).toBe(
      'name:1001ORadmin1',
    );
    expect(buildOrderSearchQuery({name: '<script>'})).toBe('name:script');
    expect(buildOrderSearchQuery({name: '###'})).toBeUndefined();
  });
});

describe('parseOrderFilters', () => {
  it('reads name and confirmation_number from search params', () => {
    const params = new URLSearchParams(
      '?name=%231001&confirmation_number=ABC123',
    );
    expect(parseOrderFilters(params)).toEqual({
      name: '#1001',
      confirmationNumber: 'ABC123',
    });
  });

  it('returns an empty object when no filters are present', () => {
    expect(parseOrderFilters(new URLSearchParams())).toEqual({});
  });
});
