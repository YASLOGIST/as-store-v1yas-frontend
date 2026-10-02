import {useRouteLoaderData} from 'react-router';

/**
 * The active store language, as used for the `<html lang>` attribute.
 * Components that format dates or numbers must follow the document locale
 * rather than hard-coding `en-US`.
 */
export function useDocumentLanguage() {
  return useRouteLoaderData('root')?.locale?.language;
}
