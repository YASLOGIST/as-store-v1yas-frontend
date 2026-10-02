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

/**
 * Format a Storefront timestamp in the document's own language.
 *
 * Article dates were pinned to `en-US`, which printed Latin months inside an
 * Arabic RTL document. Invalid or missing timestamps return an empty string so
 * a bad value never renders as "Invalid Date".
 * @param {unknown} value
 * @param {unknown} language
 */
export function formatPublishedDate(value, language) {
  if (typeof value !== 'string' && !(value instanceof Date)) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(normalizeDocumentLanguage(language), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
