import { describe, expect, it } from 'vitest';

import { sanitizeWhitelistPayload } from '@/lib/soraneo-wallet/src/util/security';
import { sanitizeIconSource } from '@/util/image';

const makeWhitelistPayload = (icon: string): string =>
  JSON.stringify([
    {
      address: '0x0200000000000000000000000000000000000000000000000000000000000000',
      symbol: 'DOT',
      name: 'Polkadot',
      decimals: 10,
      icon,
    },
  ]);

describe('sanitizeWhitelistPayload', () => {
  it('normalizes data URI icons that contain accidental newlines', () => {
    const icon = `data:image/png;base64,AAAA
BBBB
CCCC`;
    const sanitized = sanitizeWhitelistPayload(makeWhitelistPayload(icon));

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0]?.icon).toBe('data:image/png;base64,AAAABBBBCCCC');
  });

  it('keeps long data URI icons intact when they are under the max size limit', () => {
    const icon = `data:image/svg+xml,${'a'.repeat(1400)}`;
    const sanitized = sanitizeWhitelistPayload(makeWhitelistPayload(icon));

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0]?.icon).toBe(icon);
  });

  it('drops icons that exceed the max icon size limit', () => {
    const icon = `data:image/svg+xml,${'a'.repeat(33_000)}`;
    const sanitized = sanitizeWhitelistPayload(makeWhitelistPayload(icon));

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0]?.icon).toBe('');
  });

  it('preserves long url-encoded svg icons so they can be rendered later', () => {
    const rawSvg = `<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'>${"<circle cx='20' cy='20' r='10' fill='#E6007A'/>".repeat(40)}</svg>`;
    const icon = `data:image/svg+xml,${encodeURIComponent(rawSvg)}`;

    expect(icon.length).toBeGreaterThan(1024);

    const sanitized = sanitizeWhitelistPayload(makeWhitelistPayload(icon));
    const iconSource = sanitizeIconSource(sanitized[0]?.icon ?? '');

    expect(iconSource.startsWith('data:image/svg+xml;base64,')).toBe(true);
  });
});
