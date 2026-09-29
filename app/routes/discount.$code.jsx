import {redirect} from 'react-router';
import {getLocalRedirect} from '~/lib/http';
import {sanitizeCommerceCode} from '~/lib/validation';

/**
 * Automatically applies a discount found on the url
 * If a cart exists it's updated with the discount, otherwise a cart is created with the discount already applied
 *
 * @example
 * Example path applying a discount and optional redirecting (defaults to the home page)
 * ```js
 * /discount/FREESHIPPING?redirect=/products
 *
 * ```
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context, params}) {
  const {cart} = context;
  const code = sanitizeCommerceCode(params.code);
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const redirectParam = getLocalRedirect(
    request,
    searchParams.get('redirect') || searchParams.get('return_to'),
    '/',
  );
  searchParams.delete('redirect');
  searchParams.delete('return_to');

  const target = new URL(redirectParam, url.origin);
  searchParams.forEach((value, key) => target.searchParams.append(key, value));
  const redirectUrl = `${target.pathname}${target.search}${target.hash}`;

  if (!code) return redirect(redirectUrl);

  const result = await cart.updateDiscountCodes([code]);
  if (!result.cart) {
    throw new Response('Unable to apply discount', {status: 422});
  }
  const headers = cart.setCartId(result.cart.id);

  // Using set-cookie on a 303 redirect will not work if the domain origin have port number (:3000)
  // If there is no cart id and a new cart id is created in the progress, it will not be set in the cookie
  // on localhost:3000
  return redirect(redirectUrl, {
    status: 303,
    headers,
  });
}

/** @typedef {import('./+types/discount.$code').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
