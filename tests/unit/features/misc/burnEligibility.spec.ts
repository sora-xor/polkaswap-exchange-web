// @vitest-environment node

import { u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('@polkadot/util-crypto');

import { isExcludedXorBurnAddress, SORA_TRUST_BURN_ADDRESS } from '@/features/misc/lib/burnEligibility';

describe('public XOR burn campaign eligibility', () => {
  it('excludes SORA Trust by account identity across display encodings', () => {
    const account = decodeAddress(SORA_TRUST_BURN_ADDRESS);
    for (const address of [
      SORA_TRUST_BURN_ADDRESS,
      encodeAddress(account, 0),
      encodeAddress(account, 42),
      u8aToHex(account),
      `0x${u8aToHex(account).slice(2).toUpperCase()}`,
    ]) {
      expect(isExcludedXorBurnAddress(address), address).toBe(true);
    }
  });

  it('does not exclude another wallet or confuse malformed addresses with Trust', () => {
    for (const address of [
      'cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB',
      encodeAddress(new Uint8Array(32).fill(1), 42),
      '',
      'not-an-account',
      `${SORA_TRUST_BURN_ADDRESS}invalid`,
    ]) {
      expect(isExcludedXorBurnAddress(address), address).toBe(false);
    }
  });
});
