import * as serverBuild from 'virtual:react-router/server-build';
import {createRequestHandler, storefrontRedirect} from '@shopify/hydrogen';
import {createHydrogenRouterContext} from '~/lib/context';
import {getRequestId, hardenResponse, requestLog} from '~/lib/http';

/**
 * Oxygen worker entry. The request boundary owns correlation, security policy,
 * privacy-safe diagnostics, session persistence, and Shopify redirects.
 */
export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} executionContext
   * @return {Promise<Response>}
   */
  async fetch(request, env, executionContext) {
    const startedAt = performance.now();
    const requestId = getRequestId(request);
    const contentLength = Number(request.headers.get('content-length') || 0);

    if (contentLength > 1024 * 1024) {
      return hardenResponse(
        new Response('Request body too large', {status: 413}),
        {
          request,
          requestId,
          durationMs: performance.now() - startedAt,
          isProduction: process.env.NODE_ENV === 'production',
        },
      );
    }

    try {
      const hydrogenContext = await createHydrogenRouterContext(
        request,
        env,
        executionContext,
      );
      const handleRequest = createRequestHandler({
        build: serverBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => hydrogenContext,
      });

      let response = await handleRequest(request);
      response = new Response(response.body, response);

      if (hydrogenContext.session.isPending) {
        response.headers.append(
          'Set-Cookie',
          await hydrogenContext.session.commit(),
        );
      }

      if (response.status === 404) {
        response = await storefrontRedirect({
          request,
          response,
          storefront: hydrogenContext.storefront,
        });
      }

      const durationMs = performance.now() - startedAt;
      if (response.status >= 500) {
        console.error(
          requestLog({
            request,
            requestId,
            status: response.status,
            durationMs,
          }),
        );
      }

      return hardenResponse(response, {
        request,
        requestId,
        durationMs,
        isProduction: process.env.NODE_ENV === 'production',
      });
    } catch (error) {
      const durationMs = performance.now() - startedAt;
      if (process.env.NODE_ENV !== 'production') console.error(error);
      console.error(
        requestLog({
          request,
          requestId,
          status: 500,
          durationMs,
          error,
        }),
      );

      return hardenResponse(
        new Response('An unexpected error occurred', {
          status: 500,
          headers: {'Content-Type': 'text/plain; charset=utf-8'},
        }),
        {
          request,
          requestId,
          durationMs,
          isProduction: process.env.NODE_ENV === 'production',
        },
      );
    }
  },
};
