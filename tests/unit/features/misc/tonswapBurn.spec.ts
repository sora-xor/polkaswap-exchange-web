import { FPNumber } from '@sora-substrate/sdk';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { describe, expect, it, vi } from 'vitest';

// TextEncoder returns Node-realm arrays; SS58 hashing must use that same constructor in jsdom.
vi.hoisted(() => {
  vi.stubGlobal('Uint8Array', new TextEncoder().encode('').constructor);
});
vi.unmock('@polkadot/util-crypto');

import { SORA_TRUST_BURN_ADDRESS } from '@/features/misc/lib/burnEligibility';

import {
  allocateTonswapBurns,
  createTonswapXorBurnRemark,
  getTonswapCurrentRate,
  getTonswapRemaining,
  parseTonswapXorBurnRemark,
  quoteTonswapBurn,
  TONSWAP_FINAL_TS_PER_XOR,
  TONSWAP_INITIAL_TS_PER_XOR,
  TONSWAP_MAX_TS,
  TONSWAP_START_BLOCK,
  TONSWAP_XOR_CAP,
  type TonswapBurn,
} from '@/features/misc/lib/tonswapBurn';

const amount = (value: string) => new FPNumber(value);
const burn = (overrides: Partial<TonswapBurn> = {}): TonswapBurn => ({
  address: 'alice',
  amount: amount('1'),
  blockHeight: TONSWAP_START_BLOCK,
  extrinsicIndex: 0,
  txHash: `0x${'01'.repeat(32)}`,
  ...overrides,
});

describe('TONSWAP burn marker', () => {
  it('creates a distinct marker with no SORA Nexus destination', () => {
    expect(createTonswapXorBurnRemark()).toBe('{"app":"polkaswap","kind":"tonswap-xor-burn","version":1}');
    expect(parseTonswapXorBurnRemark(createTonswapXorBurnRemark())).toEqual({
      app: 'polkaswap',
      kind: 'tonswap-xor-burn',
      version: 1,
    });
    expect(
      parseTonswapXorBurnRemark(' { "version": 1, "kind": "tonswap-xor-burn", "app": "polkaswap" } ')
    ).not.toBeNull();
  });

  it.each([
    '',
    'invalid-json',
    'null',
    '[]',
    '1',
    '{"app":"polkaswap","kind":"tonswap-xor-burn"}',
    '{"app":"polkaswap","kind":"tonswap-xor-burn","version":2}',
    '{"app":"polkaswap","kind":"tonswap-xor-burn","version":"1"}',
    '{"app":"another-app","kind":"tonswap-xor-burn","version":1}',
    '{"app":"polkaswap","kind":"other-burn","version":1}',
    '{"app":"polkaswap","kind":"tonswap-xor-burn","version":1,"recipient":"alice"}',
    '{"type":"soraNexusXorClaim","version":1,"recipient":"alice"}',
  ])('rejects unrelated or malformed marker %s', (value) => {
    expect(parseTonswapXorBurnRemark(value)).toBeNull();
  });
});

describe('TONSWAP integrated reward curve', () => {
  it('uses the inclusive launch block and linear marginal rates', () => {
    expect(TONSWAP_START_BLOCK).toBe(27_720_478);
    expect(getTonswapCurrentRate(amount('0')).toString()).toBe(TONSWAP_INITIAL_TS_PER_XOR);
    expect(getTonswapCurrentRate(amount('438339.25')).toString()).toBe('38.75');
    expect(getTonswapCurrentRate(amount('876678.5')).toString()).toBe('27.5');
    expect(getTonswapCurrentRate(amount(TONSWAP_XOR_CAP)).toString()).toBe(TONSWAP_FINAL_TS_PER_XOR);
    expect(getTonswapCurrentRate(amount('2000000')).toString()).toBe('5');
  });

  it('integrates across the whole burn instead of multiplying by the starting rate', () => {
    const quote = quoteTonswapBurn(amount('0'), amount('1'));
    expect(quote.requested.toString()).toBe('1');
    expect(quote.eligible.toString()).toBe('1');
    expect(quote.excess.toString()).toBe('0');
    expect(quote.reward.toString()).toBe('49.999987167473594938');
    expect(quote.startRate.toString()).toBe('50');
    expect(FPNumber.lt(quote.endRate, quote.startRate)).toBe(true);
  });

  it('distributes exactly 48,217,317.5 TS at the global cap', () => {
    const full = quoteTonswapBurn(amount('0'), amount(TONSWAP_XOR_CAP));
    expect(full.reward.toString()).toBe(TONSWAP_MAX_TS);
    expect(full.startRate.toString()).toBe('50');
    expect(full.endRate.toString()).toBe('5');
    expect(full.excess.isZero()).toBe(true);
    expect(getTonswapRemaining(amount('0')).toString()).toBe(TONSWAP_XOR_CAP);
    expect(getTonswapRemaining(amount('1753356.5')).toString()).toBe('0.5');
    expect(getTonswapRemaining(amount(TONSWAP_XOR_CAP)).isZero()).toBe(true);
    expect(getTonswapRemaining(amount('2000000')).isZero()).toBe(true);
  });

  it('rewards only the portion under the cap while preserving the full burned amount', () => {
    const quote = quoteTonswapBurn(amount('1753356.5'), amount('2'));
    expect(quote.requested.toString()).toBe('2');
    expect(quote.eligible.toString()).toBe('0.5');
    expect(quote.excess.toString()).toBe('1.5');
    expect(quote.reward.toString()).toBe('2.500003208131601266');
    expect(quote.endRate.toString()).toBe('5');
  });

  it.each([TONSWAP_XOR_CAP, '2000000'])('gives no reward after %s XOR has burned', (before) => {
    const quote = quoteTonswapBurn(amount(before), amount('2'));
    expect(quote.eligible.isZero()).toBe(true);
    expect(quote.reward.isZero()).toBe(true);
    expect(quote.excess.toString()).toBe('2');
  });

  it('handles zero and exact 18-decimal amounts without floating point', () => {
    expect(quoteTonswapBurn(amount('0'), amount('0')).reward.isZero()).toBe(true);
    const quote = quoteTonswapBurn(amount('0'), amount('0.123456789012345678'));
    expect(quote.eligible.toCodecString()).toBe('123456789012345678');
    expect(quote.reward.toString()).toBe('6.172839255029322094');
    expect(quoteTonswapBurn(amount('0'), amount('0.000000000000000001')).reward.toCodecString()).toBe('49');
    expect(quoteTonswapBurn(amount('0'), new FPNumber('0.123456', 6)).eligible.toString()).toBe('0.123456');
  });

  it('is exactly additive when adjacent burns split the same curve interval', () => {
    let before = amount('0');
    let sum = amount('0');
    for (const part of ['0.000000000000000001', '0.123456789012345678', '1753356.876543210987654321', '2']) {
      const requested = amount(part);
      sum = sum.add(quoteTonswapBurn(before, requested).reward);
      before = before.add(requested);
    }
    expect(sum.toCodecString()).toBe(quoteTonswapBurn(amount('0'), before).reward.toCodecString());
    expect(sum.toString()).toBe(TONSWAP_MAX_TS);
  });

  it.each(['-1', 'NaN', 'Infinity', '-Infinity'])('rejects invalid natural amounts %s', (value) => {
    expect(() => quoteTonswapBurn(amount(value), amount('1'))).toThrow('Invalid TONSWAP burn amount');
    expect(() => quoteTonswapBurn(amount('0'), amount(value))).toThrow('Invalid TONSWAP burn amount');
    expect(() => getTonswapCurrentRate(amount(value))).toThrow();
    expect(() => getTonswapRemaining(amount(value))).toThrow();
  });

  it('rejects amounts whose precision would be silently truncated', () => {
    expect(() => quoteTonswapBurn(amount('0'), new FPNumber('0.0000000000000000001', 19))).toThrow(
      'exceeds supported precision'
    );
  });
});

describe('TONSWAP global finalized allocation', () => {
  it('ignores Trust burns in every total and leaves the campaign untouched', () => {
    const result = allocateTonswapBurns([
      burn({ address: SORA_TRUST_BURN_ADDRESS, amount: amount(TONSWAP_XOR_CAP) }),
      burn({
        address: encodeAddress(decodeAddress(SORA_TRUST_BURN_ADDRESS), 42),
        amount: amount(TONSWAP_XOR_CAP),
        extrinsicIndex: 1,
        txHash: '0xtrust-alias',
      }),
    ]);
    expect(result.allocations).toEqual([]);
    expect(result.totalBurned.toString()).toBe('0');
    expect(result.totalEligible.toString()).toBe('0');
    expect(result.totalReward.toString()).toBe('0');
    expect(result.remaining.toString()).toBe(TONSWAP_XOR_CAP);
    expect(getTonswapCurrentRate(result.totalEligible).toString()).toBe('50');
  });

  it('preserves other wallets exact curve allocations when Trust burns surround them', () => {
    const first = burn({ amount: amount('876678.5'), extrinsicIndex: 1 });
    const second = burn({ address: 'bob', amount: amount('876678.5'), extrinsicIndex: 3, txHash: '0xbob' });
    const eligibleOnly = allocateTonswapBurns([first, second]);
    const result = allocateTonswapBurns([
      ...[0, 2, 4].map((extrinsicIndex) =>
        burn({
          address: encodeAddress(decodeAddress(SORA_TRUST_BURN_ADDRESS), 42),
          amount: amount('999999999'),
          extrinsicIndex,
          txHash: `0xtrust-${extrinsicIndex}`,
        })
      ),
      second,
      first,
    ]);
    expect(result).toEqual(eligibleOnly);
    expect(result.totalReward.toString()).toBe(TONSWAP_MAX_TS);
    expect(result.allocations[1].burnedBefore.toString()).toBe('876678.5');
  });

  it('still rejects conflicting evidence involving an excluded account', () => {
    expect(() => allocateTonswapBurns([burn(), burn({ address: SORA_TRUST_BURN_ADDRESS })])).toThrow(
      'Conflicting TONSWAP burn identity'
    );
  });

  it('allocates by block and extrinsic, preserving each burning wallet as owner', () => {
    const early = burn({ amount: amount('876678.5'), extrinsicIndex: 1 });
    const late = burn({ address: 'bob', amount: amount('876680.5'), extrinsicIndex: 2, txHash: '0xsecond' });
    const last = burn({ address: 'carol', blockHeight: TONSWAP_START_BLOCK + 1, txHash: '0xthird' });
    const input = [last, late, early];
    const result = allocateTonswapBurns(input);
    expect(result.allocations.map(({ address }) => address)).toEqual(['alice', 'bob', 'carol']);
    expect(input).toEqual([last, late, early]);
    expect(result.allocations[0].reward.toString()).toBe('33971291.875');
    expect(result.allocations[1].burnedBefore.toString()).toBe('876678.5');
    expect(result.allocations[1].eligible.toString()).toBe('876678.5');
    expect(result.allocations[1].excess.toString()).toBe('2');
    expect(result.allocations[1].reward.toString()).toBe('14246025.625');
    expect(result.allocations[2].reward.isZero()).toBe(true);
    expect(result.totalBurned.toString()).toBe('1753360');
    expect(result.totalEligible.toString()).toBe(TONSWAP_XOR_CAP);
    expect(result.totalReward.toString()).toBe(TONSWAP_MAX_TS);
    expect(result.remaining.isZero()).toBe(true);
  });

  it('ignores burns before the inclusive start block', () => {
    const result = allocateTonswapBurns([
      burn({ blockHeight: TONSWAP_START_BLOCK - 1, amount: amount(TONSWAP_XOR_CAP), txHash: '0xold' }),
      burn(),
    ]);
    expect(result.totalBurned.toString()).toBe('1');
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].startRate.toString()).toBe('50');
  });

  it('returns the untouched campaign for an empty global stream', () => {
    const result = allocateTonswapBurns([]);
    expect(result.allocations).toEqual([]);
    expect(result.totalBurned.isZero()).toBe(true);
    expect(result.totalEligible.isZero()).toBe(true);
    expect(result.totalReward.isZero()).toBe(true);
    expect(result.remaining.toString()).toBe(TONSWAP_XOR_CAP);
  });

  it('deduplicates identical finalized transactions', () => {
    const result = allocateTonswapBurns([burn(), burn(), burn({ txHash: burn().txHash.toUpperCase() })]);
    expect(result.allocations).toHaveLength(1);
    expect(result.totalBurned.toString()).toBe('1');
  });

  it.each([
    { address: 'bob' },
    { amount: amount('2') },
    { blockHeight: TONSWAP_START_BLOCK + 1 },
    { extrinsicIndex: 1 },
    { txHash: '0xanother' },
  ])('fails closed on conflicting transaction or position duplicates %j', (override) => {
    expect(() => allocateTonswapBurns([burn(), burn(override)])).toThrow('Conflicting TONSWAP burn identity');
  });

  it.each([
    { blockHeight: Number.NaN },
    { blockHeight: Number.MAX_SAFE_INTEGER + 1 },
    { blockHeight: -1 },
    { blockHeight: 27_720_478.5 },
    { extrinsicIndex: undefined },
    { extrinsicIndex: Number.NaN },
    { extrinsicIndex: -1 },
    { extrinsicIndex: 0.5 },
    { extrinsicIndex: Number.MAX_SAFE_INTEGER + 1 },
    { txHash: '' },
    { address: ' ' },
    { amount: amount('0') },
    { amount: amount('-1') },
    { amount: amount('NaN') },
  ])('fails closed on missing identity, ordering, or invalid amounts %j', (override) => {
    expect(() => allocateTonswapBurns([burn(override)])).toThrow();
  });
});
