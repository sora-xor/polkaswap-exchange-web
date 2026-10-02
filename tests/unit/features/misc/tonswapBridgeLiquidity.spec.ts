import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Operation } from '@sora-substrate/sdk';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';
import { TONSWAP_MAINNET_GENESIS } from '@/indexer/queries/tonswapBurn';
import {
  assertTonswapBridgeQuote,
  hasTonswapBridgeFundingTag,
  TONSWAP_BRIDGE_FUNDING_TAG,
  BUY_XOR_BRIDGE_FUNDING_TAG,
  getTonswapBridgeFundingPurpose,
  getTonswapBridgeFundingPayload,
  tonswapBridgeFailureTranslation,
  tonswapBridgeSigningIdentity,
} from '@/features/misc/lib/tonswapBridgeLiquidity';

describe('guided bridge signing quote', () => {
  beforeEach(() => vi.restoreAllMocks());
  function setup() {
    const tx = {
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: DAI.address,
      externalNetwork: 1,
      from: 'sora-user',
      to: 'evm-user',
      payload: { tonswapFunding: TONSWAP_BRIDGE_FUNDING_TAG },
    };
    const state = {
      connected: true,
      genesis: TONSWAP_MAINNET_GENESIS,
      fees: {
        swapFeeCodec: '200000000000000',
        burnFeeCodec: '100000000000000',
        slippageTolerance: '1',
      },
    };
    const quote = vi.fn(async () => ({ amount: '1800000000000000000', amountWithoutImpact: '1810000000000000000' }));
    return { tx, state, quote, dependencies: { quote, readState: () => state } };
  }
  it('does not change ordinary bridge policy and detects malformed present tags', async () => {
    const { tx, quote, dependencies } = setup();
    expect(hasTonswapBridgeFundingTag(tx)).toBe(true);
    expect(hasTonswapBridgeFundingTag({ payload: {} })).toBe(false);
    await expect(assertTonswapBridgeQuote({ payload: {} }, dependencies)).resolves.toBeNull();
    expect(quote).not.toHaveBeenCalled();
    await expect(assertTonswapBridgeQuote({ ...tx, payload: { tonswapFunding: false } }, dependencies)).rejects.toThrow(
      'CONTEXT_CHANGED'
    );
  });
  it('quotes the exact codec amount and validates coverage before returning an expiry', async () => {
    const { tx, quote, dependencies } = setup();
    const now = Date.now();
    const expires = await assertTonswapBridgeQuote(tx, dependencies);
    expect(quote).toHaveBeenCalledWith('10000000000000000000');
    expect(expires).toBeGreaterThan(now);
  });
  it.each([
    { type: Operation.EthBridgeOutgoing },
    { externalNetwork: 5 },
    { assetAddress: 'other' },
    { amount: '0' },
    { from: '' },
    { to: '' },
  ])('rejects changed guided transfer inputs before requesting a quote: %j', async (patch) => {
    const { tx, quote, dependencies } = setup();
    await expect(assertTonswapBridgeQuote({ ...tx, ...patch }, dependencies)).rejects.toThrow('CONTEXT_CHANGED');
    expect(quote).not.toHaveBeenCalled();
  });
  it('rejects high impact, output below fee reserves, and unknown fees', async () => {
    const { tx, state, quote, dependencies } = setup();
    quote.mockResolvedValueOnce({ amount: '1000000000000000000', amountWithoutImpact: '2000000000000000000' });
    await expect(assertTonswapBridgeQuote(tx, dependencies)).rejects.toThrow('QUOTE_REQUIRED');
    quote.mockResolvedValueOnce({ amount: '1', amountWithoutImpact: '1' });
    await expect(assertTonswapBridgeQuote(tx, dependencies)).rejects.toThrow('QUOTE_REQUIRED');
    state.fees.swapFeeCodec = '0';
    await expect(assertTonswapBridgeQuote(tx, dependencies)).rejects.toThrow('QUOTE_REQUIRED');
  });
  it('rejects disconnects, different mainnet, changed input, and slow quote responses', async () => {
    for (const mutation of ['disconnected', 'genesis', 'amount', 'slow']) {
      const { tx, state, quote, dependencies } = setup();
      const time = vi.spyOn(Date, 'now').mockReturnValue(1_000);
      quote.mockImplementationOnce(async () => {
        if (mutation === 'disconnected') state.connected = false;
        if (mutation === 'genesis') state.genesis = 'other';
        if (mutation === 'amount') tx.amount = '11';
        if (mutation === 'slow') time.mockReturnValue(32_000);
        return { amount: '1800000000000000000', amountWithoutImpact: '1810000000000000000' };
      });
      await expect(assertTonswapBridgeQuote(tx, dependencies)).rejects.toThrow('QUOTE_REQUIRED');
      time.mockRestore();
    }
  });
  it('keeps tracking changes out of identity but detects signing and campaign changes', () => {
    const { tx } = setup();
    const identity = tonswapBridgeSigningIdentity(tx);
    expect(tonswapBridgeSigningIdentity({ ...tx, ...{ status: 'pending' } })).toBe(identity);
    expect(tonswapBridgeSigningIdentity({ ...tx, amount: '11' })).not.toBe(identity);
    expect(tonswapBridgeSigningIdentity({ ...tx, payload: {} })).not.toBe(identity);
    expect(tonswapBridgeFailureTranslation('GET_TS_BRIDGE_QUOTE_REQUIRED')).toBe('getTs.liquidity.unavailable');
    expect(tonswapBridgeFailureTranslation('GET_TS_BRIDGE_CONTEXT_CHANGED')).toBe('getTs.bridgePreparationError');
    expect(tonswapBridgeFailureTranslation('GET_TS_BRIDGE_CONTEXT_CHANGED', 'xor')).toBe(
      'buyXor.bridgePreparationError'
    );
    expect(tonswapBridgeFailureTranslation('GET_TS_BRIDGE_QUOTE_REQUIRED', 'xor')).toBe('getTs.liquidity.unavailable');
    expect(tonswapBridgeFailureTranslation('other')).toBeNull();
  });
  it('uses generic swap-only fee coverage without weakening the TS burn reserve or malformed-tag policy', async () => {
    const { tx, state, dependencies } = setup();
    const generic = { ...tx, payload: getTonswapBridgeFundingPayload('xor') };
    expect(getTonswapBridgeFundingPurpose(generic)).toBe('xor');
    expect(getTonswapBridgeFundingPurpose(tx)).toBe('ts');
    expect(hasTonswapBridgeFundingTag(generic)).toBe(true);
    state.fees.burnFeeCodec = '0';
    await expect(assertTonswapBridgeQuote(generic, dependencies)).resolves.toBeGreaterThan(Date.now());
    await expect(assertTonswapBridgeQuote(tx, dependencies)).rejects.toThrow('QUOTE_REQUIRED');
    for (const payload of [{ buyXorFunding: false }, { ...tx.payload, buyXorFunding: BUY_XOR_BRIDGE_FUNDING_TAG }]) {
      expect(hasTonswapBridgeFundingTag({ ...tx, payload })).toBe(true);
      expect(getTonswapBridgeFundingPurpose({ ...tx, payload })).toBeNull();
      await expect(assertTonswapBridgeQuote({ ...tx, payload }, dependencies)).rejects.toThrow('CONTEXT_CHANGED');
    }
    expect(tonswapBridgeSigningIdentity(generic)).not.toBe(tonswapBridgeSigningIdentity(tx));
  });
});
