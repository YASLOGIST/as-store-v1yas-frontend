import {writeFile} from 'node:fs/promises';

// Deterministic non-secret bindings consumed only by the local mocked API mode.
// The storefront token is a 32-char placeholder because hydrogen's analytics
// treats shorter values as private tokens and logs a client-side error.
await writeFile(
  '.env.e2e',
  `E2E_MOCK_MODE=1
PUBLIC_STORE_DOMAIN=mock.myshopify.com
PUBLIC_STOREFRONT_API_TOKEN=0000000000000000000000000000mock
PUBLIC_CHECKOUT_DOMAIN=mock.myshopify.com
PUBLIC_STORE_LANGUAGE=AR
PUBLIC_STORE_COUNTRY=EG
PUBLIC_STORE_MARKETS=EN-US,AR-EG
SESSION_SECRET=local-e2e-secret-that-is-longer-than-32-characters
`,
);
