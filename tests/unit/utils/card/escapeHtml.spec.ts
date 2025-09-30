import { describe, expect, it } from 'vitest';

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
});
