import {getSitemapIndex} from '@shopify/hydrogen';
import {
  CRAWLER_CACHE_SECONDS,
  crawlerUnavailable,
  isThrownResponse,
} from '~/lib/crawlers';

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context: {storefront}}) {
  try {
    const response = await getSitemapIndex({storefront, request});

    response.headers.set('Cache-Control', `max-age=${CRAWLER_CACHE_SECONDS}`);

    return response;
  } catch (error) {
    // Hydrogen throws when any resource type is missing from the index query.
    // Answer with a retryable 503 instead of an HTML error document, which
    // crawlers would otherwise parse as a permanently broken sitemap.
    if (isThrownResponse(error)) throw error;
    return crawlerUnavailable(error, {resource: 'sitemap.xml'});
  }
}

/** @typedef {import('./+types/[sitemap.xml]').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
