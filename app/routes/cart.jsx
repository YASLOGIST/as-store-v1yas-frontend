import {useLoaderData, data} from 'react-router';
import {CartForm} from '@shopify/hydrogen';
import {CartMain} from '~/components/CartMain';
import {buildRouteMeta} from '~/lib/seo';
import {assertSameOrigin, getLocalRedirect} from '~/lib/http';
import {assertCartInput, sanitizeCommerceCode} from '~/lib/validation';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return buildRouteMeta({
    title: 'Cart',
    description: 'Review your cart and check out.',
    noIndex: true,
  });
};

/**
 * @type {HeadersFunction}
 */
export const headers = ({actionHeaders, loaderHeaders}) => {
  const headers = new Headers(loaderHeaders);
  new Headers(actionHeaders).forEach((value, key) =>
    headers.append(key, value),
  );
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  return headers;
};

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  assertSameOrigin(request);
  const {cart} = context;
  const formData = await request.formData();
  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Response('No cart action provided', {status: 400});
  }
  assertCartInput(action, inputs);

  let status = 200;
  let result;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = sanitizeCommerceCode(inputs.discountCode);

      // Combine the user-entered code with codes already applied to the cart.
      const discountCodes = formDiscountCode ? [formDiscountCode] : [];
      discountCodes.push(...(inputs.discountCodes ?? []));

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesAdd: {
      const formGiftCardCode = sanitizeCommerceCode(inputs.giftCardCode);
      const giftCardCodes = formGiftCardCode ? [formGiftCardCode] : [];

      result = await cart.addGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesRemove: {
      const appliedGiftCardIds = inputs.giftCardCodes;
      result = await cart.removeGiftCardCodes(appliedGiftCardIds);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Response('Unsupported cart action', {status: 400});
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const {cart: cartResult, errors, warnings} = result;

  const redirectTo = formData.get('redirectTo');
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', getLocalRedirect(request, redirectTo));
  }
  headers.set('Cache-Control', 'private, no-store, max-age=0');

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
}

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  const {cart} = context;
  return await cart.get();
}

export default function Cart() {
  /** @type {LoaderReturnData} */
  const cart = useLoaderData();

  return (
    <div className="cart">
      <span className="eyebrow">Cart</span>
      <h1>Your cart</h1>
      <CartMain layout="page" cart={cart} />
    </div>
  );
}

/** @typedef {import('react-router').HeadersFunction} HeadersFunction */
/** @typedef {import('./+types/cart').Route} Route */
/** @typedef {import('@shopify/hydrogen').CartQueryDataReturn} CartQueryDataReturn */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
