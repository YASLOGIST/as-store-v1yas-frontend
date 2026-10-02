import {Link, useLoaderData} from 'react-router';
import {buildRouteMeta} from '~/lib/seo';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return buildRouteMeta({
    title: data?.policy.title,
    description: `${data?.policy.title ?? 'Policy'} for YAS Store.`,
  });
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({params, context}) {
  if (!params.handle) {
    throw new Response('No handle was passed in', {status: 404});
  }

  const policyName = params.handle.replace(/-([a-z])/g, (_, m1) =>
    m1.toUpperCase(),
  );

  const data = await context.storefront.query(POLICY_CONTENT_QUERY, {
    cache: context.storefront.CacheLong(),
    variables: {
      privacyPolicy: false,
      shippingPolicy: false,
      termsOfService: false,
      refundPolicy: false,
      [policyName]: true,
      language: context.storefront.i18n?.language,
    },
  });

  const policy = data.shop?.[policyName];

  if (!policy) {
    throw new Response('Could not find the policy', {status: 404});
  }

  return {policy};
}

export default function Policy() {
  /** @type {LoaderReturnData} */
  const {policy} = useLoaderData();

  return (
    <div className="policy">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link prefetch="intent" to="/">
          Home
        </Link>
        <span className="crumb-sep" aria-hidden="true">
          /
        </span>
        <Link prefetch="intent" to="/policies">
          Policies
        </Link>
        <span className="crumb-sep" aria-hidden="true">
          /
        </span>
        <span aria-current="page">{policy.title}</span>
      </nav>
      <h1>{policy.title}</h1>
      <div
        className="article-content"
        dangerouslySetInnerHTML={{__html: policy.body}}
      />
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/Shop
const POLICY_CONTENT_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    body
    handle
    id
    title
    url
  }
  query Policy(
    $country: CountryCode
    $language: LanguageCode
    $privacyPolicy: Boolean!
    $refundPolicy: Boolean!
    $shippingPolicy: Boolean!
    $termsOfService: Boolean!
  ) @inContext(language: $language, country: $country) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) {
        ...Policy
      }
      shippingPolicy @include(if: $shippingPolicy) {
        ...Policy
      }
      termsOfService @include(if: $termsOfService) {
        ...Policy
      }
      refundPolicy @include(if: $refundPolicy) {
        ...Policy
      }
    }
  }
`;

/**
 * @typedef {keyof Pick<
 *   Shop,
 *   'privacyPolicy' | 'shippingPolicy' | 'termsOfService' | 'refundPolicy'
 * >} SelectedPolicies
 */

/** @typedef {import('./+types/policies.$handle').Route} Route */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Shop} Shop */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
