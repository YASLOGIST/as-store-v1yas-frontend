import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
import {assertRuntimeEnv, getStoreLocale} from '~/lib/env';

// Define the additional context object
const additionalContext = {
  // Additional context for custom properties, CMS clients, 3P SDKs, etc.
  // These will be available as both context.propertyName and context.get(propertyContext)
  // Example of complex objects that could be added:
  // cms: await createCMSClient(env),
  // reviews: await createReviewsClient(env),
};

/**
 * Creates Hydrogen context for React Router 7.9.x
 * Returns HydrogenRouterContextProvider with hybrid access patterns
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} executionContext
 */
export async function createHydrogenRouterContext(
  request,
  env,
  executionContext,
) {
  const {sessionSecrets} = assertRuntimeEnv(env);
  const i18n = getStoreLocale(env, request);
  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, sessionSecrets),
  ]);

  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      i18n,
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    additionalContext,
  );

  // The fixture is loaded lazily so the deterministic test catalog never ships
  // in the production request path.
  if (env.E2E_MOCK_MODE === '1') {
    const {applyMockStorefront} = await import('~/lib/mock-storefront');
    return applyMockStorefront(hydrogenContext, request);
  }

  return hydrogenContext;
}

/** @typedef {Class<additionalContext>} AdditionalContextType */
