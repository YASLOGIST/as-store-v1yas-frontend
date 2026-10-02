import {describe, expect, it} from 'vitest';
import {
  formatPublishedDate,
  getTextDirection,
  normalizeDocumentLanguage,
} from './locale';

describe('document locale', () => {
  it.each([
    ['AR', 'ar', 'rtl'],
    ['ar-SA', 'ar-sa', 'rtl'],
    ['he_IL', 'he-il', 'rtl'],
    ['en-GB', 'en-gb', 'ltr'],
  ])(
    'normalizes %s and resolves its direction',
    (input, language, direction) => {
      expect(normalizeDocumentLanguage(input)).toBe(language);
      expect(getTextDirection(input)).toBe(direction);
    },
  );

  it.each([null, '', '../ar', 'english', 'en<script>'])(
    'falls back safely for %s',
    (input) => {
      expect(normalizeDocumentLanguage(input)).toBe('en');
      expect(getTextDirection(input)).toBe('ltr');
    },
  );
});

describe('formatPublishedDate', () => {
  it('formats in the document language rather than a fixed locale', () => {
    const iso = '2026-02-04T09:00:00Z';

    expect(formatPublishedDate(iso, 'en')).toBe('February 4, 2026');
    expect(formatPublishedDate(iso, 'ar')).not.toBe(
      formatPublishedDate(iso, 'en'),
    );
  });

  it('falls back to English for unusable language values', () => {
    expect(formatPublishedDate('2026-02-04T09:00:00Z', undefined)).toBe(
      'February 4, 2026',
    );
  });

  it('returns an empty string instead of "Invalid Date"', () => {
    expect(formatPublishedDate('not-a-date', 'en')).toBe('');
    expect(formatPublishedDate(null, 'en')).toBe('');
    expect(formatPublishedDate(undefined, 'en')).toBe('');
  });
});
