import {redirect} from 'react-router';
import {assertSameOrigin, getLocalRedirect} from '~/lib/http';
import {getStoreMarkets} from '~/lib/env';

export async function action({request, context}) {
  assertSameOrigin(request);
  const form = await request.formData();
  const market = String(form.get('market') || '').toUpperCase();
  const allowed = getStoreMarkets(context.env).some(
    (item) => item.code === market,
  );
  if (!allowed) throw new Response('Unsupported market', {status: 400});

  const destination = getLocalRedirect(request, form.get('redirectTo'), '/');
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return redirect(destination, {
    status: 303,
    headers: {
      'Set-Cookie': `yas_locale=${market}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
