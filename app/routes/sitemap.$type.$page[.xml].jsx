import {getSitemap} from '@shopify/hydrogen';
import {
  CRAWLER_CACHE_SECONDS,
  crawlerUnavailable,
  isThrownResponse,
} from '~/lib/crawlers';

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, params, context: {storefront}}) {
  try {
    const response = await getSitemap({
      storefront,
      request,
      params,
      // This storefront does not define locale-prefixed routes. Emitting
      // Shopify's example EN-US/EN-CA/FR-CA paths here created crawlable URLs
      // that only 404ed. Publish canonical, reachable routes until locale path
      // routing is introduced.
      getLink: buildSitemapLink,
    });

    response.headers.set('Cache-Control', `max-age=${CRAWLER_CACHE_SECONDS}`);

    return response;
  } catch (error) {
    // Unknown types and pages are thrown Responses (404) and stay as-is; an
    // upstream fault becomes a retryable 503 rather than an HTML 500.
    if (isThrownResponse(error)) throw error;
    return crawlerUnavailable(error, {
      resource: `sitemap/${params.type}/${params.page}.xml`,
    });
  }
}

/**
 * Canonical URL builder kept independent of locale metadata because this route
 * tree currently has no locale path segment.
 * @param {{type: string; baseUrl: string; handle: string}}
 */
export function buildSitemapLink({type, baseUrl, handle}) {
  return `${baseUrl}/${type}/${encodeURIComponent(handle)}`;
}

/** @typedef {import('./+types/sitemap.$type.$page[.xml]').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
