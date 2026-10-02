/**
 * Copy and recovery action for a route error, chosen by status class.
 *
 * The single "Something went sideways / Try again" state was wrong for the
 * errors a storefront actually produces: retrying does nothing for an expired
 * session (401/403), and a rate-limited shopper needs to be told to wait.
 * @param {number} status
 */
export function errorState(status) {
  if (status === 404) {
    return {
      title: 'Page not found',
      body: "The page you're looking for doesn't exist or has been moved.",
      action: 'home',
    };
  }

  if (status === 401 || status === 403) {
    return {
      title: 'Session expired',
      body: 'Sign in again to reach your account, orders and addresses.',
      action: 'signin',
    };
  }

  if (status === 429) {
    return {
      title: 'Too many requests',
      body: 'The store is rate-limiting this device. Wait a moment, then retry.',
      action: 'retry',
    };
  }

  if (status >= 400 && status < 500) {
    return {
      title: 'That request could not be processed',
      body: 'Check the address, or start again from the catalog.',
      action: 'home',
    };
  }

  return {
    title: 'Something went sideways',
    body: 'We could not complete that request. Please try again in a moment.',
    action: 'retry',
  };
}
