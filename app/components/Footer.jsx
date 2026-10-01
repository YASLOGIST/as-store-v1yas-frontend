import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import {LogoMark} from '~/components/Icons';
import {resolveMenuUrl} from '~/lib/navigation';

/**
 * @param {FooterProps}
 */
export function Footer({footer: footerPromise, header, publicStoreDomain}) {
  return (
    <Suspense fallback={<div className="footer" aria-hidden="true" />}>
      <Await resolve={footerPromise}>
        {(footer) => (
          <footer className="footer">
            <div className="footer-inner">
              <div className="footer-brand">
                <span className="footer-brand-logo">
                  <LogoMark size={30} />
                  <span className="gradient-text">
                    {header?.shop?.name ?? 'YAS Store'}
                  </span>
                </span>
                <p>
                  High-tech gear, engineered for tomorrow. Every product in the
                  catalog is curated for people who build the future.
                </p>
              </div>

              <div>
                <h5 className="footer-heading">Navigate</h5>
                {footer?.menu && header.shop.primaryDomain?.url && (
                  <FooterMenu
                    menu={footer.menu}
                    primaryDomainUrl={header.shop.primaryDomain.url}
                    publicStoreDomain={publicStoreDomain}
                  />
                )}
              </div>

              <div>
                <h5 className="footer-heading">Explore</h5>
                <nav aria-label="Explore" className="footer-menu">
                  <NavLink end prefetch="intent" to="/collections">
                    All collections
                  </NavLink>
                  <NavLink end prefetch="intent" to="/search">
                    Search
                  </NavLink>
                  <NavLink end prefetch="intent" to="/blogs">
                    Journal
                  </NavLink>
                  <NavLink end prefetch="intent" to="/policies">
                    Policies
                  </NavLink>
                </nav>
              </div>
            </div>

            <div className="footer-bottom">
              <span>
                © {new Date().getFullYear()} {header?.shop?.name ?? 'YAS Store'}{' '}
                — All rights reserved
              </span>
              <span className="footer-powered">
                <span className="pulse" aria-hidden="true" />
                Powered by{' '}
                <a
                  href="https://shopify.dev/docs/custom-storefronts/hydrogen"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Hydrogen
                </a>
              </span>
            </div>
          </footer>
        )}
      </Await>
    </Suspense>
  );
}

/**
 * @param {{
 *   menu: FooterQuery['menu'];
 *   primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url'];
 *   publicStoreDomain: string;
 * }}
 */
function FooterMenu({menu, primaryDomainUrl, publicStoreDomain}) {
  return (
    <nav aria-label="Footer" className="footer-menu">
      {(menu || FALLBACK_FOOTER_MENU).items.map((item) => {
        const destination = resolveMenuUrl({
          url: item.url,
          primaryDomainUrl,
          publicStoreDomain,
        });
        if (!destination) return null;

        return destination.external ? (
          <a
            href={destination.href}
            key={item.id}
            rel="noopener noreferrer"
            target="_blank"
          >
            {item.title}
          </a>
        ) : (
          <NavLink
            end
            key={item.id}
            prefetch="intent"
            className={({isActive}) => (isActive ? 'active' : '')}
            to={destination.href}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

const FALLBACK_FOOTER_MENU = {
  id: 'gid://shopify/Menu/199655620664',
  items: [
    {
      id: 'gid://shopify/MenuItem/461633060920',
      resourceId: 'gid://shopify/ShopPolicy/23358046264',
      tags: [],
      title: 'Privacy Policy',
      type: 'SHOP_POLICY',
      url: '/policies/privacy-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633093688',
      resourceId: 'gid://shopify/ShopPolicy/23358013496',
      tags: [],
      title: 'Refund Policy',
      type: 'SHOP_POLICY',
      url: '/policies/refund-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633126456',
      resourceId: 'gid://shopify/ShopPolicy/23358111800',
      tags: [],
      title: 'Shipping Policy',
      type: 'SHOP_POLICY',
      url: '/policies/shipping-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633159224',
      resourceId: 'gid://shopify/ShopPolicy/23358079032',
      tags: [],
      title: 'Terms of Service',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
      items: [],
    },
  ],
};

/**
 * @typedef {Object} FooterProps
 * @property {Promise<FooterQuery|null>} footer
 * @property {HeaderQuery} header
 * @property {string} publicStoreDomain
 */

/** @typedef {import('storefrontapi.generated').FooterQuery} FooterQuery */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
