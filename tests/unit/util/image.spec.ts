import { describe, expect, it } from 'vitest';

import { sanitizeIconSource } from '@/util/image';

const decodeSvgPayload = (dataUri: string): string => {
  const payload = dataUri.split(',')[1] ?? '';
  return Buffer.from(payload, 'base64').toString('utf-8');
};

describe('sanitizeIconSource', () => {
  it('accepts utf8-encoded svg data URIs and normalizes them to base64', () => {
    const input =
      "data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2010%2010'%3E%3Ccircle%20cx='5'%20cy='5'%20r='4'/%3E%3C/svg%3E";

    const sanitized = sanitizeIconSource(input);

    expect(sanitized.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(decodeSvgPayload(sanitized)).toContain('<svg');
    expect(decodeSvgPayload(sanitized)).toContain('<circle');
  });

  it('strips script nodes from utf8-encoded svg data URIs', () => {
    const input =
      "data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3Cscript%3Ealert(1)%3C/script%3E%3Ccircle%20cx='5'%20cy='5'%20r='4'/%3E%3C/svg%3E";

    const sanitized = sanitizeIconSource(input);
    const decoded = decodeSvgPayload(sanitized);

    expect(sanitized.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(decoded.toLowerCase()).not.toContain('<script');
    expect(decoded).toContain('<circle');
  });
});
