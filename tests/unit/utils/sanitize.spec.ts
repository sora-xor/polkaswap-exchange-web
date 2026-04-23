import { afterEach, describe, expect, it } from 'vitest';

import { escapeHtml, sanitizeHtml } from '@/utils/sanitize';

describe('escapeHtml', () => {
  it('returns an empty string for nullish values', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('escapes special HTML characters after string conversion', () => {
    expect(escapeHtml(`5 > 3 & "quoted" <tag attr='x'>`)).toBe(
      '5 &gt; 3 &amp; &quot;quoted&quot; &lt;tag attr=&#39;x&#39;&gt;'
    );
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('sanitizeHtml', () => {
  const originalDOMParser = globalThis.DOMParser;
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.DOMParser = originalDOMParser;
    (globalThis as any).window = originalWindow;
  });

  it('returns an empty string for nullish or empty input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });

  it('preserves allowed tags and attributes while removing unsafe attributes', () => {
    expect(
      sanitizeHtml(
        '<p class="lead" style="color:red">Hello <strong onclick="alert(1)">there</strong><img src="x"></p>'
      )
    ).toBe('<p class="lead">Hello <strong>there</strong></p>');
  });

  it('drops dangerous element content and unwraps unknown tags', () => {
    expect(sanitizeHtml('<script>alert(1)</script><custom><em>safe</em></custom><noscript>hidden</noscript>')).toBe(
      '<em>safe</em>'
    );
  });

  it('keeps only safe link protocols and hardens links opened in a new tab', () => {
    expect(
      sanitizeHtml(
        '<a href="javascript:alert(1)" target="_blank">bad</a>' +
          '<a href="https://polkaswap.io" target="_blank" rel="nofollow">good</a>' +
          '<a href="mailto:support@example.org">mail</a>'
      )
    ).toBe(
      '<a target="_blank" rel="noopener noreferrer">bad</a>' +
        '<a href="https://polkaswap.io" target="_blank" rel="nofollow noopener noreferrer">good</a>' +
        '<a href="mailto:support@example.org">mail</a>'
    );
  });

  it('uses the localhost parsing base when window location is unavailable', () => {
    (globalThis as any).window = {};

    expect(sanitizeHtml('<a href="/relative/path">relative</a>')).toBe('<a href="/relative/path">relative</a>');
  });

  it('drops malformed URL attributes and comments', () => {
    expect(sanitizeHtml('before<!-- hidden --><a href="http://exa mple.com">bad</a>after')).toBe(
      'before<a>bad</a>after'
    );
  });

  it('supports custom allow lists with case-insensitive tag and attribute names', () => {
    expect(
      sanitizeHtml('<section data-id="42"><span class="ignored">Value</span></section>', {
        allowedTags: ['SECTION'],
        allowedAttributes: {
          section: ['DATA-ID'],
        },
      })
    ).toBe('<section data-id="42">Value</section>');
  });

  it('escapes input when DOMParser is unavailable', () => {
    globalThis.DOMParser = undefined as unknown as typeof DOMParser;

    expect(sanitizeHtml('<strong>plain</strong>')).toBe('&lt;strong&gt;plain&lt;/strong&gt;');
  });

  it('escapes input when DOMParser throws', () => {
    (globalThis as any).DOMParser = class {
      parseFromString() {
        throw new Error('parse failed');
      }
    };

    expect(sanitizeHtml('<strong>plain</strong>')).toBe('&lt;strong&gt;plain&lt;/strong&gt;');
  });
});
