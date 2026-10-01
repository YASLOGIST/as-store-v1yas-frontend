import {parseShopDomain} from './validation';

const REQUIRED_PUBLIC_ENV = [
  'PUBLIC_STORE_DOMAIN',
  'PUBLIC_STOREFRONT_API_TOKEN',
  'PUBLIC_CHECKOUT_DOMAIN',
];

/**
 * Fail once, at the request boundary, with actionable configuration errors.
 * Secret values are never included in thrown messages.
 * @param {Env} env
 */
export function assertRuntimeEnv(env) {
  const missing = REQUIRED_PUBLIC_ENV.filter(
    (name) => typeof env?.[name] !== 'string' || !env[name].trim(),
  );
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  parseShopDomain(env.PUBLIC_STORE_DOMAIN);
  parseShopDomain(env.PUBLIC_CHECKOUT_DOMAIN);

  const secrets = getSessionSecrets(env);
  if (secrets.some((secret) => secret.length < 32)) {
    throw new Error('SESSION_SECRET entries must be at least 32 characters');
  }

  return {sessionSecrets: secrets};
}

/**
 * Comma-separated secrets support zero-downtime rotation. The first secret signs
 * new cookies; remaining entries continue validating old cookies.
 * @param {Env} env
 */
export function getSessionSecrets(env) {
  if (typeof env?.SESSION_SECRET !== 'string' || !env.SESSION_SECRET.trim()) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  return env.SESSION_SECRET.split(',')
    .map((secret) => secret.trim())
    .filter(Boolean);
}

/**
 * Resolve the Shopify market used by Storefront and Customer Account clients.
 * Values are deployment configuration rather than browser input. Invalid values
 * fail fast instead of producing hard-to-diagnose GraphQL enum errors.
 * @param {Env} env
 */
export function getStoreLocale(env, request) {
  const language = (env?.PUBLIC_STORE_LANGUAGE || 'EN').trim().toUpperCase();
  const country = (env?.PUBLIC_STORE_COUNTRY || 'US').trim().toUpperCase();

  if (!/^[A-Z]{2}(?:_[A-Z]{2})?$/.test(language)) {
    throw new Error(
      'PUBLIC_STORE_LANGUAGE must be a Shopify language code such as EN, AR, or PT_BR',
    );
  }
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new Error(
      'PUBLIC_STORE_COUNTRY must be a two-letter country code such as US or AE',
    );
  }

  const configured = getStoreMarkets(env);
  const cookie = request?.headers
    ?.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('yas_locale='))
    ?.slice('yas_locale='.length);
  const requested = configured.find((market) => market.code === cookie);
  return requested
    ? {language: requested.language, country: requested.country}
    : {language, country};
}

export function getStoreMarkets(env) {
  const fallback = `${(env?.PUBLIC_STORE_LANGUAGE || 'EN').trim().toUpperCase()}-${(
    env?.PUBLIC_STORE_COUNTRY || 'US'
  )
    .trim()
    .toUpperCase()}`;
  const values = [fallback, ...(env?.PUBLIC_STORE_MARKETS || '').split(',')]
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(values)].map((code) => {
    const [language, country] = code.split('-');
    if (
      !/^[A-Z]{2}(?:_[A-Z]{2})?$/.test(language) ||
      !/^[A-Z]{2}$/.test(country)
    ) {
      throw new Error(`Invalid PUBLIC_STORE_MARKETS entry: ${code}`);
    }
    return {code, language, country};
  });
}
