import {Link, useLoaderData} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {buildRouteMeta} from '~/lib/seo';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return buildRouteMeta({
    title: 'Journal',
    description: 'Stories, releases and deep dives from the team.',
  });
};

const EMPTY_BLOGS = {
  nodes: [],
  pageInfo: {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  },
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context, request}) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 10,
  });

  const [data] = await Promise.all([
    context.storefront.query(BLOGS_QUERY, {
      cache: context.storefront.CacheShort(),
      variables: {
        ...paginationVariables,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  // A store with no blog resource returns no connection. That is an empty
  // journal, not a server fault, so render the empty state instead of 500ing.
  return {blogs: data?.blogs ?? EMPTY_BLOGS};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData() {
  return {};
}

export default function Blogs() {
  /** @type {LoaderReturnData} */
  const {blogs} = useLoaderData();
  const hasBlogs = Boolean(blogs?.nodes?.length);

  return (
    <div className="blogs">
      <div className="collection-header">
        <span className="eyebrow">Journal</span>
        <h1>Field notes</h1>
        <p className="collection-description">
          Teardowns, bench measurements and release notes from the people who
          build and test the catalog.
        </p>
      </div>
      {hasBlogs ? (
        <PaginatedResourceSection
          connection={blogs}
          resourcesClassName="blogs-grid"
        >
          {({node: blog}) => (
            <Link
              className="blog-channel"
              key={blog.handle}
              prefetch="intent"
              to={`/blogs/${blog.handle}`}
            >
              <h2>{blog.title}</h2>
              {blog.seo?.description ? (
                <p className="collection-description">{blog.seo.description}</p>
              ) : null}
            </Link>
          )}
        </PaginatedResourceSection>
      ) : (
        <div className="collection-empty">
          <h2>Nothing published yet</h2>
          <p>
            The journal is empty for now. In the meantime, the catalog is where
            the work shows up first.
          </p>
          <Link className="btn btn-primary" to="/collections/all">
            Browse the catalog
          </Link>
        </div>
      )}
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog
const BLOGS_QUERY = `#graphql
  query Blogs(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    blogs(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        title
        handle
        seo {
          title
          description
        }
      }
    }
  }
`;

/** @typedef {BlogsQuery['blogs']['nodes'][0]} BlogNode */

/** @typedef {import('./+types/blogs._index').Route} Route */
/** @typedef {import('storefrontapi.generated').BlogsQuery} BlogsQuery */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
