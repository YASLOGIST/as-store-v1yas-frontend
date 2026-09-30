const RTL_LANGUAGES = new Set([
  'ar',
  'ckb',
  'dv',
  'fa',
  'he',
  'ku',
  'ps',
  'sd',
  'ug',
  'ur',
]);

/**
 * Return a safe, normalized BCP-47-ish language value for the document shell.
 * Shopify normally supplies a two-letter code, but this remains defensive when
 * stores provide a regional locale or runtime data is unavailable.
 * @param {unknown} language
 */
export function normalizeDocumentLanguage(language) {
  if (typeof language !== 'string') return 'en';
  const normalized = language.trim().replaceAll('_', '-').toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(normalized) ? normalized : 'en';
}

/** @param {unknown} language */
export function getTextDirection(language) {
  const primary = normalizeDocumentLanguage(language).split('-')[0];
  return RTL_LANGUAGES.has(primary) ? 'rtl' : 'ltr';
}
