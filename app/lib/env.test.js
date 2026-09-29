import {describe, expect, it} from 'vitest';
import {assertRuntimeEnv, getSessionSecrets} from './env';

const validEnv = {
  PUBLIC_STORE_DOMAIN: 'store.myshopify.com',
  PUBLIC_STOREFRONT_API_TOKEN: 'public-token',
  PUBLIC_CHECKOUT_DOMAIN: 'checkout.example.com',
  SESSION_SECRET: 'a-secure-session-secret-with-32-characters',
};

describe('runtime environment validation', () => {
  it('accepts a complete environment and returns rotated secrets', () => {
    const env = {
      ...validEnv,
      SESSION_SECRET:
        'new-secret-with-at-least-32-characters,old-secret-with-at-least-32-characters',
    };
    expect(assertRuntimeEnv(/** @type {any} */ (env))).toEqual({
      sessionSecrets: [
        'new-secret-with-at-least-32-characters',
        'old-secret-with-at-least-32-characters',
      ],
    });
  });

  it('reports missing names without exposing any secret values', () => {
    expect(() =>
      assertRuntimeEnv(/** @type {any} */ ({SESSION_SECRET: 'private'})),
    ).toThrow(/PUBLIC_STORE_DOMAIN/);
  });

  it('rejects weak secrets', () => {
    expect(() =>
      assertRuntimeEnv(
        /** @type {any} */ ({...validEnv, SESSION_SECRET: 'too-short'}),
      ),
    ).toThrow(/at least 32/);
  });

  it('requires at least one session secret', () => {
    expect(() => getSessionSecrets(/** @type {any} */ ({}))).toThrow(
      /SESSION_SECRET/,
    );
  });
});
