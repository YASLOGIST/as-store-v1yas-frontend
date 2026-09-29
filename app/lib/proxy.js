import {assertSameOrigin} from './http';
import {isStorefrontApiVersion, parseShopDomain} from './validation';

const MAX_GRAPHQL_BODY_BYTES = 256 * 1024;
const FORWARDED_HEADERS = [
  'accept',
  'content-type',
  'shopify-storefront-buyer-ip',
  'x-shopify-storefront-access-token',
];

/**
 * A constrained same-origin proxy for Shopify's checkout GraphQL endpoint.
 * @param {{request: Request; version?: string; checkoutDomain?: string}} input
 */
export async function proxyCheckoutGraphql({request, version, checkoutDomain}) {
  assertSameOrigin(request);

  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: {Allow: 'POST'},
    });
  }
  if (!isStorefrontApiVersion(version)) {
    return new Response('Unsupported API version', {status: 400});
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_GRAPHQL_BODY_BYTES) {
    return new Response('Request body too large', {status: 413});
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_GRAPHQL_BODY_BYTES) {
    return new Response('Request body too large', {status: 413});
  }

  const headers = new Headers();
  FORWARDED_HEADERS.forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });

  const domain = parseShopDomain(checkoutDomain);
  const upstream = await fetch(
    `https://${domain}/api/${version}/graphql.json`,
    {
      method: 'POST',
      body,
      headers,
      signal: request.signal,
    },
  );

  const responseHeaders = new Headers();
  ['content-type', 'shopify-storefront-buyer-ip'].forEach((name) => {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  });
  responseHeaders.set('Cache-Control', 'private, no-store, max-age=0');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
