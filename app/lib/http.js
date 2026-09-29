const SAFE_REQUEST_ID = /^[a-zA-Z0-9._:-]{8,128}$/;
const SENSITIVE_PATHS = ['/account', '/api/', '/cart', '/discount/'];

/**
 * Create a correlation id without trusting arbitrary client input.
 * @param {Request} request
 */
export function getRequestId(request) {
  const incoming = request.headers.get('x-request-id');
  if (incoming && SAFE_REQUEST_ID.test(incoming)) return incoming;

  return globalThis.crypto?.randomUUID?.() ?? randomId();
}

/**
 * Add defense-in-depth headers and edge diagnostics to every app response.
 * Mutates and returns the response so streamed bodies are not buffered.
 * @param {Response} response
 * @param {{request: Request; requestId: string; durationMs?: number; isProduction?: boolean}} options
 */
export function hardenResponse(
  response,
  {request, requestId, durationMs, isProduction = true},
) {
  // Fetch-originated responses can carry an immutable header guard. Rewrap the
  // same stream to guarantee policy headers remain writable without buffering.
  response = new Response(response.body, response);
  const {headers} = response;
  const url = new URL(request.url);

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set(
    'Permissions-Policy',
    'accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(self), usb=()',
  );
  headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  headers.set('Origin-Agent-Cluster', '?1');
  headers.set('X-DNS-Prefetch-Control', 'on');
  headers.set('X-Request-ID', requestId);

  if (isProduction && url.protocol === 'https:') {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }

  if (Number.isFinite(durationMs)) {
    headers.append(
      'Server-Timing',
      `app;dur=${Math.max(0, durationMs).toFixed(1)}`,
    );
  }

  const isSensitive = SENSITIVE_PATHS.some((path) =>
    url.pathname.startsWith(path),
  );
  if (isSensitive || headers.has('Set-Cookie')) {
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    headers.set('Pragma', 'no-cache');
  }

  return response;
}

/**
 * Reject browser cross-site mutations while retaining compatibility with
 * server-to-server clients that do not send browser fetch metadata.
 * @param {Request} request
 */
export function assertSameOrigin(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) return;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    throw new Response('Cross-site request rejected', {status: 403});
  }

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    throw new Response('Invalid request origin', {status: 403});
  }
}

/**
 * Resolve a user-controlled redirect into a same-origin path. Protocol-relative
 * URLs, backslashes, control characters, and foreign origins are rejected.
 * @param {Request} request
 * @param {FormDataEntryValue | null | undefined} target
 * @param {string} [fallback]
 */
export function getLocalRedirect(request, target, fallback = '/cart') {
  if (typeof target !== 'string') return fallback;

  const value = target.trim();
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    hasControlCharacters(value)
  ) {
    return fallback;
  }

  try {
    const requestUrl = new URL(request.url);
    const redirectUrl = new URL(value, requestUrl);
    if (redirectUrl.origin !== requestUrl.origin) return fallback;
    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Build a small, structured log record without serializing headers, cookies,
 * tokens, query strings, or arbitrary thrown objects.
 * @param {{request: Request; requestId: string; status: number; durationMs: number; error?: unknown}} input
 */
export function requestLog({request, requestId, status, durationMs, error}) {
  const url = new URL(request.url);
  return JSON.stringify({
    level: error ? 'error' : status >= 500 ? 'error' : 'info',
    event: 'http_request',
    requestId,
    method: request.method,
    path: url.pathname,
    status,
    durationMs: Math.round(durationMs),
    ...(error
      ? {
          error:
            error instanceof Error
              ? {name: error.name}
              : {name: 'UnknownError'},
        }
      : {}),
  });
}

function hasControlCharacters(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127;
  });
}

function randomId() {
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}
