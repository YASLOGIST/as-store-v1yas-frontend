import {describe, expect, it} from 'vitest';
import {resolveMenuUrl} from './navigation';

const domains = {
  primaryDomainUrl: 'https://store.example',
  publicStoreDomain: 'store.myshopify.com',
};

describe('resolveMenuUrl', () => {
  it('keeps relative links internal', () => {
    expect(resolveMenuUrl({...domains, url: '/collections/new?q=1'})).toEqual({
      href: '/collections/new?q=1',
      external: false,
    });
  });

  it('normalizes same-store absolute links', () => {
    expect(
      resolveMenuUrl({
        ...domains,
        url: 'https://store.example/products/widget?Color=Blue',
      }),
    ).toEqual({
      href: '/products/widget?Color=Blue',
      external: false,
    });
  });

  it('marks safe foreign links as external', () => {
    expect(
      resolveMenuUrl({...domains, url: 'https://hydrogen.shopify.dev/docs'}),
    ).toEqual({
      href: 'https://hydrogen.shopify.dev/docs',
      external: true,
    });
    expect(
      resolveMenuUrl({...domains, url: 'https://another-shop.myshopify.com'}),
    ).toMatchObject({external: true});
  });

  it.each(['javascript:alert(1)', 'data:text/html,bad', '//evil.example'])(
    'drops unsafe URL %s',
    (url) => expect(resolveMenuUrl({...domains, url})).toBeNull(),
  );
});
