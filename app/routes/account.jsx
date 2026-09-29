import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
} from 'react-router';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import {buildRouteMeta} from '~/lib/seo';

export const meta = () =>
  buildRouteMeta({
    title: 'Account',
    description: 'Manage your YAS Store profile, addresses and orders.',
    noIndex: true,
  });

export function shouldRevalidate() {
  return true;
}

/** @param {Route.LoaderArgs} args */
export async function loader({context}) {
  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {language: customerAccount.i18n.language},
  });

  if (errors?.length || !data?.customer) {
    throw new Response('Customer account unavailable', {status: 401});
  }

  return remixData(
    {customer: data.customer},
    {headers: {'Cache-Control': 'private, no-store, max-age=0'}},
  );
}

export default function AccountLayout() {
  /** @type {LoaderReturnData} */
  const {customer} = useLoaderData();
  const heading = customer?.firstName
    ? `Welcome, ${customer.firstName}`
    : 'Your account';

  return (
    <div className="account">
      <div className="account-sidebar">
        <span className="eyebrow">Account</span>
        <h1>{heading}</h1>
        <AccountMenu />
      </div>
      <div className="account-content">
        <Outlet context={{customer}} />
      </div>
    </div>
  );
}

function AccountMenu() {
  const navClassName = ({isActive, isPending}) =>
    `${isActive ? 'active' : ''}${isPending ? ' pending' : ''}`;

  return (
    <nav className="account-menu" aria-label="Account navigation">
      <NavLink to="/account/orders" className={navClassName}>
        Orders
      </NavLink>
      <NavLink to="/account/profile" className={navClassName}>
        Profile
      </NavLink>
      <NavLink to="/account/addresses" className={navClassName}>
        Addresses
      </NavLink>
      <Logout />
    </nav>
  );
}

function Logout() {
  return (
    <Form className="account-logout" method="POST" action="/account/logout">
      <button type="submit">Sign out</button>
    </Form>
  );
}

/** @typedef {import('./+types/account').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
