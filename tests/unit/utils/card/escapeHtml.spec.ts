import { describe, expect, it, vi } from 'vitest';

import { escapeHtml, sanitizeHtml } from '@/utils/sanitize';

describe('sanitize utilities', () => {
  it('escapeHtml neutralizes HTML significant characters', () => {
    const payload = "<img src=x onerror=alert('xss')> Please resubmit";

    const sanitized = escapeHtml(payload);

    expect(sanitized).toBe('&lt;img src=x onerror=alert(&#39;xss&#39;)&gt; Please resubmit');
    expect(sanitized.includes('<img')).toBe(false);
  });

  it('escapeHtml handles nullish values', () => {
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(null)).toBe('');
  });

  it('sanitizeHtml removes disallowed tags while keeping allowed ones', () => {
    const payload = '<div><script>alert(\'xss\')</script><a href="https://polkaswap.io">Link</a></div>';

    const sanitized = sanitizeHtml(payload);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('<a href="https://polkaswap.io">Link</a>');
  });

  it('sanitizeHtml drops dangerous protocols', () => {
    const payload = '<a href="javascript:alert(1)">Click</a>';

    const sanitized = sanitizeHtml(payload);

    expect(sanitized).toBe('<a>Click</a>');
  });

  it('sanitizeHtml drops entity-encoded dangerous protocols', () => {
    const payload = '<a href="javascript&#58;alert(1)">Click</a>';

    const sanitized = sanitizeHtml(payload);

    expect(sanitized).toBe('<a>Click</a>');
  });

  it('unwraps unknown tags while keeping sanitized allowed children', () => {
    const payload = '<section><span class="safe">Hello</span><script>alert(1)</script></section>';

    const sanitized = sanitizeHtml(payload);

    expect(sanitized).toBe('<span class="safe">Hello</span>');
  });

  it('adds rel protections for links opened in a new tab', () => {
    const payload = '<a href="https://polkaswap.io" target="_blank" rel="nofollow">Link</a>';

    const sanitized = sanitizeHtml(payload);

    expect(sanitized).toBe(
      '<a href="https://polkaswap.io" target="_blank" rel="nofollow noopener noreferrer">Link</a>'
    );
  });

  it('falls back to escaping when DOM parsing is unavailable', () => {
    const originalDOMParser = globalThis.DOMParser;

    try {
      vi.stubGlobal('DOMParser', undefined);

      expect(sanitizeHtml('<strong>Hello</strong>')).toBe('&lt;strong&gt;Hello&lt;/strong&gt;');
    } finally {
      if (originalDOMParser) {
        vi.stubGlobal('DOMParser', originalDOMParser);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });
});
