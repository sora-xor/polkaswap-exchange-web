import { describe, expect, it } from 'vitest';

import { isInternalHashHref, normalizeHashHref } from '@/utils/hashHref';

describe('utils/hashHref', () => {
  describe('normalizeHashHref', () => {
    it('strips leading slashes from origin-root hash links', () => {
      expect(normalizeHashHref('/#/swap')).toBe('#/swap');
      expect(normalizeHashHref('/#/' as string)).toBe('#/');
      expect(normalizeHashHref('/#')).toBe('#');
    });

    it('keeps already relative hash links unchanged', () => {
      expect(normalizeHashHref('#/swap')).toBe('#/swap');
    });

    it('keeps absolute URLs unchanged', () => {
      expect(normalizeHashHref('https://polkaswap.io/#/swap')).toBe('https://polkaswap.io/#/swap');
      expect(normalizeHashHref('http://example.com/#/swap')).toBe('http://example.com/#/swap');
    });
  });

  describe('isInternalHashHref', () => {
    it('returns true for relative hash-router links', () => {
      expect(isInternalHashHref('#/swap')).toBe(true);
    });

    it('returns true for origin-root hash-router links (after normalization)', () => {
      expect(isInternalHashHref('/#/swap')).toBe(true);
    });

    it('returns false for absolute URLs even if they contain hash-router fragments', () => {
      expect(isInternalHashHref('https://polkaswap.io/#/swap')).toBe(false);
    });

    it('returns false for non-hash links', () => {
      expect(isInternalHashHref('/swap')).toBe(false);
      expect(isInternalHashHref('swap')).toBe(false);
    });
  });
});
