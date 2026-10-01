const HEALTH_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
};

/**
 * Lightweight readiness endpoint for Oxygen probes. Context creation has already
 * validated required runtime configuration, so reaching this loader proves the
 * worker booted with a usable environment. It intentionally performs no Shopify
 * request and exposes no build, environment, or credential details.
 */
export function loader() {
  return new Response(JSON.stringify({status: 'ok'}), {
    status: 200,
    headers: HEALTH_HEADERS,
  });
}
