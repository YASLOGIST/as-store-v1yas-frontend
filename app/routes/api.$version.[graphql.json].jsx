import {proxyCheckoutGraphql} from '~/lib/proxy';

/**
 * @param {Route.ActionArgs}
 */
export async function action({params, context, request}) {
  return proxyCheckoutGraphql({
    request,
    version: params.version,
    checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
  });
}

/** @typedef {import('./+types/api.$version.[graphql.json]').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
