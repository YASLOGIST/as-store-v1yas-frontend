import {describe, expect, it} from 'vitest';
import {getTextDirection, normalizeDocumentLanguage} from './locale';

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
