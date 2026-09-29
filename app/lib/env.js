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
