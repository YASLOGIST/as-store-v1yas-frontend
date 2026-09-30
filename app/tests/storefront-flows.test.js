import {CartForm} from '@shopify/hydrogen';
import {describe, expect, it, vi} from 'vitest';
import {action as cartAction, loader as cartLoader} from '../routes/cart';
import {loader as productLoader} from '../routes/products.$handle';
import {loader as searchLoader} from '../routes/search';

function cartRequest(action, inputs, extra = {}) {
  const form = new FormData();
  form.set(CartForm.INPUT_NAME, JSON.stringify({action, inputs}));
  if (extra.redirectTo) form.set('redirectTo', extra.redirectTo);
  return new Request('https://shop.example/cart', {
    method: 'POST',
    headers: {origin: extra.origin ?? 'https://shop.example'},
    body: form,
  });
}

describe('critical storefront flows', () => {
  it('loads a cart and adds a validated line with a safe redirect', async () => {
    const line = {
      merchandiseId: 'gid://shopify/ProductVariant/123',
      quantity: 2,
    };
    const cart = {
      get: vi.fn().mockResolvedValue({id: 'cart-existing'}),
      addLines: vi.fn().mockResolvedValue({
        cart: {id: 'gid://shopify/Cart/abc', totalQuantity: 2},
        errors: [],
        warnings: [],
      }),
      setCartId: vi.fn(() => new Headers({'Set-Cookie': 'cart=abc'})),
    };

    await expect(cartLoader({context: {cart}})).resolves.toEqual({
      id: 'cart-existing',
    });
    const response = await cartAction({
      request: cartRequest(
        CartForm.ACTIONS.LinesAdd,
        {lines: [line]},
        {
          redirectTo: '/collections/new',
        },
      ),
      context: {cart},
    });

    expect(cart.addLines).toHaveBeenCalledWith([line]);
    expect(response.init.status).toBe(303);
    expect(new Headers(response.init.headers).get('location')).toBe(
      '/collections/new',
    );
    expect(response.data.cart.totalQuantity).toBe(2);
  });

  it('blocks a cross-origin cart mutation before touching the cart API', async () => {
    const cart = {addLines: vi.fn()};
    await expect(
      cartAction({
        request: cartRequest(
          CartForm.ACTIONS.LinesAdd,
          {
            lines: [
              {
                merchandiseId: 'gid://shopify/ProductVariant/123',
                quantity: 1,
              },
            ],
          },
          {origin: 'https://attacker.example'},
        ),
        context: {cart},
      }),
    ).rejects.toMatchObject({status: 403});
    expect(cart.addLines).not.toHaveBeenCalled();
  });

  it('normalizes a search term and maps successful Storefront API results', async () => {
    const query = vi.fn().mockResolvedValue({
      products: {nodes: [{id: 'p1'}], pageInfo: {}},
      pages: {nodes: []},
      articles: {nodes: []},
    });
    const result = await searchLoader({
      request: new Request(
        'https://shop.example/search?q=%20%20future%20%20gear',
      ),
      context: {storefront: {query}},
    });

    expect(result.term).toBe('future gear');
    expect(result.result.total).toBe(1);
    expect(query).toHaveBeenCalledOnce();
  });

  it('returns a recoverable search state when the upstream API fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await searchLoader({
      request: new Request('https://shop.example/search?q=gear'),
      context: {
        storefront: {query: vi.fn().mockRejectedValue(new Error('upstream'))},
      },
    });

    expect(result).toMatchObject({
      type: 'regular',
      term: 'gear',
      error: 'Search is temporarily unavailable. Please try again.',
      result: {total: 0},
    });
    error.mockRestore();
  });

  it('returns 404 for a missing product rather than rendering invalid data', async () => {
    const context = {
      storefront: {
        CacheShort: vi.fn(),
        query: vi.fn().mockResolvedValue({product: null}),
      },
    };

    await expect(
      productLoader({
        context,
        params: {handle: 'missing'},
        request: new Request('https://shop.example/products/missing'),
      }),
    ).rejects.toMatchObject({status: 404});
  });
});
