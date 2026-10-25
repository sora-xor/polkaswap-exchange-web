import { describe, expect, it } from 'vitest';

import { parseSubstrateHeaderNumber } from '@/services/realtime/substrate';

describe('parseSubstrateHeaderNumber', () => {
  it('parses valid substrate header numbers', () => {
    expect(parseSubstrateHeaderNumber({ number: '0x0' })).toBe(0);
    expect(parseSubstrateHeaderNumber({ number: '0x1a' })).toBe(26);
    expect(parseSubstrateHeaderNumber({ number: '0x000f' })).toBe(15);
  });

  it('returns null for invalid payloads', () => {
    expect(parseSubstrateHeaderNumber(undefined)).toBeNull();
    expect(parseSubstrateHeaderNumber(null)).toBeNull();
    expect(parseSubstrateHeaderNumber('0x10')).toBeNull();
    expect(parseSubstrateHeaderNumber({})).toBeNull();
    expect(parseSubstrateHeaderNumber({ number: 10 })).toBeNull();
    expect(parseSubstrateHeaderNumber({ number: '10' })).toBeNull();
    expect(parseSubstrateHeaderNumber({ number: '0xzz' })).toBeNull();
  });
});
