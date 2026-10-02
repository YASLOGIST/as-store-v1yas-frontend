import {describe, expect, it} from 'vitest';
import {errorState} from './errorStates';

describe('route error states', () => {
  it('keeps 404 a navigation problem, not a failure', () => {
    const state = errorState(404);

    expect(state.title).toBe('Page not found');
    expect(state.action).toBe('home');
  });

  it('sends an expired session to sign-in instead of a pointless retry', () => {
    for (const status of [401, 403]) {
      expect(errorState(status).action).toBe('signin');
    }
  });

  it('tells a rate-limited shopper to wait before retrying', () => {
    const state = errorState(429);

    expect(state.title).toBe('Too many requests');
    expect(state.action).toBe('retry');
    expect(state.body).toMatch(/wait/i);
  });

  it('offers retry only for server-side failures among 4xx/5xx', () => {
    expect(errorState(500).action).toBe('retry');
    expect(errorState(503).action).toBe('retry');
    expect(errorState(400).action).toBe('home');
  });

  it('always returns usable copy and a known action', () => {
    for (const status of [0, 302, 400, 401, 404, 418, 429, 500, 599]) {
      const state = errorState(status);

      expect(state.title.length).toBeGreaterThan(0);
      expect(state.body.length).toBeGreaterThan(0);
      expect(['home', 'retry', 'signin']).toContain(state.action);
    }
  });
});
