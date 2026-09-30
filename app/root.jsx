import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import favicon from '~/assets/favicon.svg';
import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
import {websiteJsonLd} from '~/lib/seo';
import {getTextDirection, normalizeDocumentLanguage} from '~/lib/locale';
import {StructuredData} from '~/components/StructuredData';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import {PageLayout} from '~/components/PageLayout';
import {LogoMark} from '~/components/Icons';

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 * @type {ShouldRevalidateFunction}
 */
export const shouldRevalidate = ({formMethod, currentUrl, nextUrl}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
      crossOrigin: 'anonymous',
    },
    {rel: 'dns-prefetch', href: 'https://cdn.shopify.com'},
    {
      rel: 'preconnect',
      href: 'https://shop.app',
      crossOrigin: 'anonymous',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
    {rel: 'manifest', href: '/manifest.webmanifest'},
    {rel: 'apple-touch-icon', href: '/icons/icon-192.png'},
  ];
}

/**
 * Base meta tags shared by every route. Route-level meta functions
 * merge on top of these (leaf tags win per name/property).
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  const shopName = data?.header?.shop?.name ?? 'YAS Store';
  const origin = data?.origin;
  return [
    {name: 'theme-color', content: '#05060c'},
    {property: 'og:site_name', content: shopName},
    ...(origin
      ? [{property: 'og:image', content: `${origin}/og-image.jpg`}]
      : []),
  ];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const {storefront, env} = args.context;

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    origin: new URL(args.request.url).origin,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    locale: {
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context}) {
  const {storefront} = context;

  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {header};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData({context}) {
  const {storefront, customerAccount, cart} = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
      },
    })
    .catch((error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });
  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  };
}

/**
 * @param {{children?: React.ReactNode}} props
 */
export function Layout({children}) {
  const nonce = useNonce();
  const rootData = useRouteLoaderData('root');
  const language = normalizeDocumentLanguage(rootData?.locale?.language);
  const direction = getTextDirection(language);

  return (
    <html lang={language} dir={direction}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="color-scheme" content="dark" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  /** @type {RootLoader} */
  const data = useRouteLoaderData('root');
  const nonce = useNonce();

  if (!data) {
    return <Outlet />;
  }

  return (
    <Analytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <StructuredData
        nonce={nonce}
        data={websiteJsonLd({
          shopName: data.header?.shop?.name ?? 'YAS Store',
          url: data.origin,
        })}
      />
      <PageLayout {...data}>
        <Outlet />
      </PageLayout>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorStatus = 500;
  let errorMessage = 'Unknown error';

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage =
      typeof error.data === 'string'
        ? error.data
        : (error.data?.message ?? error.statusText);
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  const isNotFound = errorStatus === 404;
  const showDetails = import.meta.env.DEV && Boolean(errorMessage);

  return (
    <div className="route-error">
      <LogoMark size={56} />
      <h2>{errorStatus}</h2>
      <h1>{isNotFound ? 'Page not found' : 'Something went sideways'}</h1>
      <p>
        {isNotFound
          ? "The page you're looking for doesn't exist or has been moved."
          : 'We could not complete that request. Please try again in a moment.'}
      </p>
      <div className="route-error-actions">
        <a className="btn btn-primary" href="/">
          Return home
        </a>
        {!isNotFound ? (
          <button
            className="btn btn-ghost"
            onClick={() => window.location.reload()}
            type="button"
          >
            Try again
          </button>
        ) : null}
      </div>
      {showDetails ? (
        <details>
          <summary>Developer details</summary>
          <pre>{errorMessage}</pre>
        </details>
      ) : null}
    </div>
  );
}

/** @typedef {LoaderReturnData} RootLoader */

/** @typedef {import('react-router').ShouldRevalidateFunction} ShouldRevalidateFunction */
/** @typedef {import('./+types/root').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
