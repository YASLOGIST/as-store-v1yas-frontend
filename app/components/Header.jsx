import {Suspense} from 'react';
import {Await, Form, NavLink, useAsyncValue, useLocation} from 'react-router';
import {useAnalytics, useOptimisticCart} from '@shopify/hydrogen';
import {useAsideActions} from '~/components/Aside';
import {
  IconCart,
  IconMenu,
  IconSearch,
  IconUser,
  LogoMark,
} from '~/components/Icons';
import {resolveMenuUrl} from '~/lib/navigation';

/**
 * @param {HeaderProps}
 */
export function Header({
  header,
  isLoggedIn,
  cart,
  locale,
  markets,
  publicStoreDomain,
}) {
  const {shop, menu} = header;
  return (
    <header className="header">
      <NavLink prefetch="intent" to="/" end className="header-brand">
        <span className="header-brand-logo">
          <LogoMark size={20} />
        </span>
        <span>{shop?.name ?? 'YAS Store'}</span>
      </NavLink>
      <HeaderMenu
        menu={menu}
        viewport="desktop"
        primaryDomainUrl={header.shop.primaryDomain.url}
        publicStoreDomain={publicStoreDomain}
      />
      <HeaderCtas
        isLoggedIn={isLoggedIn}
        cart={cart}
        locale={locale}
        markets={markets}
      />
    </header>
  );
}

/**
 * @param {{
 *   menu: HeaderProps['header']['menu'];
 *   primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
 *   viewport: Viewport;
 *   publicStoreDomain: HeaderProps['publicStoreDomain'];
 * }}
 */
export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}) {
  const {close} = useAsideActions();

  return (
    <nav
      aria-label={viewport === 'mobile' ? 'Mobile menu' : 'Primary'}
      className={`header-menu-${viewport}`}
    >
      {viewport === 'mobile' && (
        <NavLink end onClick={close} prefetch="intent" to="/">
          Home
        </NavLink>
      )}
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
        const destination = resolveMenuUrl({
          url: item.url,
          primaryDomainUrl,
          publicStoreDomain,
        });
        if (!destination) return null;

        if (destination.external) {
          return (
            <a
              className="header-menu-item"
              href={destination.href}
              key={item.id}
              onClick={close}
              rel="noopener noreferrer"
              target="_blank"
            >
              {item.title}
            </a>
          );
        }

        return (
          <NavLink
            className={({isActive, isPending}) =>
              `header-menu-item${isActive ? ' active' : ''}${
                isPending ? ' pending' : ''
              }`
            }
            end
            key={item.id}
            onClick={close}
            prefetch="intent"
            to={destination.href}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

/**
 * @param {Pick<HeaderProps, 'isLoggedIn' | 'cart'>}
 */
function HeaderCtas({isLoggedIn, cart, locale, markets}) {
  return (
    <nav aria-label="Store tools" className="header-ctas">
      <HeaderMenuMobileToggle />
      <LanguageSwitcher locale={locale} markets={markets} />
      <NavLink
        prefetch="intent"
        to="/account"
        className={({isActive}) => `header-cta${isActive ? ' active' : ''}`}
        aria-label="Account or sign in"
      >
        <IconUser />
        <span className="header-cta-label" aria-hidden="true">
          <Suspense fallback="Sign in">
            <Await resolve={isLoggedIn} errorElement="Sign in">
              {(isLoggedIn) => (isLoggedIn ? 'Account' : 'Sign in')}
            </Await>
          </Suspense>
        </span>
      </NavLink>
      <SearchToggle />
      <CartToggle cart={cart} />
    </nav>
  );
}

function LanguageSwitcher({locale, markets = []}) {
  const location = useLocation();
  if (markets.length < 2) return null;
  const current = `${locale?.language || 'EN'}-${locale?.country || 'US'}`;
  return (
    <Form
      className="locale-switcher"
      method="post"
      action="/locale"
      reloadDocument
    >
      <input
        name="redirectTo"
        type="hidden"
        value={`${location.pathname}${location.search}`}
      />
      <label className="sr-only" htmlFor="market-switcher">
        Language and market
      </label>
      <select
        aria-label="Language and market"
        defaultValue={current}
        id="market-switcher"
        name="market"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {markets.map((market) => (
          <option key={market.code} value={market.code}>
            {market.language} · {market.country}
          </option>
        ))}
      </select>
    </Form>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAsideActions();
  return (
    <button
      className="header-cta header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
      aria-label="Open menu"
    >
      <IconMenu />
    </button>
  );
}

function SearchToggle() {
  const {open} = useAsideActions();
  return (
    <button
      className="header-cta reset"
      onClick={() => open('search')}
      aria-label="Search"
    >
      <IconSearch />
      <span className="header-cta-label" aria-hidden="true">
        Search
      </span>
      <kbd aria-hidden="true">Ctrl/⌘ K</kbd>
    </button>
  );
}

/**
 * @param {{count: number | null}}
 */
function CartBadge({count}) {
  const {open} = useAsideActions();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <a
      href="/cart"
      className="header-cta header-cta-cart"
      aria-label={
        count
          ? `Open cart, ${count} item${count === 1 ? '' : 's'}`
          : 'Open cart'
      }
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        });
      }}
    >
      <IconCart />
      <span className="header-cta-label" aria-hidden="true">
        Cart
      </span>
      {count === null ? null : (
        <span key={count} className="cart-count">
          {count}
        </span>
      )}
    </a>
  );
}

/**
 * @param {Pick<HeaderProps, 'cart'>}
 */
function CartToggle({cart}) {
  return (
    <Suspense fallback={<CartBadge count={null} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue();
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Blog',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Policies',
      type: 'HTTP',
      url: '/policies',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'About',
      type: 'PAGE',
      url: '/pages/about',
      items: [],
    },
  ],
};

/** @typedef {'desktop' | 'mobile'} Viewport */
/**
 * @typedef {Object} HeaderProps
 * @property {HeaderQuery} header
 * @property {Promise<CartApiQueryFragment|null>} cart
 * @property {Promise<boolean>} isLoggedIn
 * @property {string} publicStoreDomain
 */

/** @typedef {import('@shopify/hydrogen').CartViewPayload} CartViewPayload */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
