import { FPNumber } from '@sora-substrate/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  requestGetTsPlanPreview,
  requestGetTsCardQuote,
  parseGetTsQuoteJson,
  isGetTsPlanAmount,
  getTsPlanAssets,
  type GetTsPlanDependencies,
} from '@/features/misc/lib/getTsPlanQuote';
import { quoteTonswapBurn, TONSWAP_START_BLOCK } from '@/features/misc/lib/tonswapBurn';
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: { connection: null } }));
vi.mock('@/indexer/queries/tonswapBurn', () => ({
  TONSWAP_MAINNET_GENESIS: 'mainnet',
  fetchTonswapBurnSnapshot: vi.fn(),
}));
vi.mock('@/features/misc/lib/tonswapConversion', () => ({ requestTonswapConversionQuote: vi.fn() }));
const amount = (value: string) => new FPNumber(value).toCodecString();
const deps = (): GetTsPlanDependencies => ({
  fees: { swapFeeCodec: amount('0.001'), burnFeeCodec: amount('0.002'), slippageTolerance: '1' },
  checkMainnet: () => true,
  now: () => 1000,
  snapshot: async () => ({ burns: [], indexedThroughBlock: TONSWAP_START_BLOCK, fresh: true }),
  quoteDai: async () => ({ amount: amount('100'), amountWithoutImpact: amount('102') }),
});
const conversion = {
  outputAmount: amount('10'),
  minOutputAmount: amount('9.8'),
  outputDecimals: 18,
  priceImpactPercent: '1',
  fees: [],
  expiresAt: 31000,
};
const sora = { source: 'sora', paymentAsset: 'DAI', amount: '10' } as const;

describe('amount-first Get TS plan', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('keeps exact amount bounds and network-specific assets', () => {
    expect(getTsPlanAssets('ton')).toEqual(['USDT', 'TON']);
    expect(isGetTsPlanAmount('0.000000000000000001', 'XOR')).toBe(true);
    for (const value of ['0', '-1', '01', '1e3', '1.0000000000000000001', '9'.repeat(61)])
      expect(isGetTsPlanAmount(value, 'XOR')).toBe(false);
    expect(isGetTsPlanAmount('1.001', 'USD')).toBe(false);
  });
  it('subtracts exact marked burn fee from an XOR budget and integrates the campaign curve', async () => {
    const d = deps();
    d.quoteDai = vi.fn();
    const result = await requestGetTsPlanPreview({ source: 'xor', paymentAsset: 'XOR', amount: '1.002' }, d);
    expect(result).toMatchObject({
      state: 'ready',
      feasible: true,
      burnableXor: '1',
      estimatedTs: '49.999987167473594938',
      costCoverage: 'complete',
      expiresAt: 31000,
    });
    expect(d.quoteDai).not.toHaveBeenCalled();
  });
  it('accounts for conversion allowance, SORA slippage and both fees before the TS curve', async () => {
    const result = await requestGetTsPlanPreview(sora, deps());
    expect(result).toMatchObject({
      state: 'ready',
      burnableXor: '97.017',
      daiAmount: '10',
      daiIntent: '10',
      estimatedTs: quoteTonswapBurn(FPNumber.ZERO, new FPNumber('97.017')).reward.toString(),
    });
  });
  it('quotes generic spendable XOR independently of campaign totals and burn fees', async () => {
    const snapshot = vi.fn().mockRejectedValue(new Error('Campaign unavailable'));
    const result = await requestGetTsPlanPreview(
      { ...sora, purpose: 'xor' },
      {
        ...deps(),
        snapshot,
        fees: { swapFeeCodec: amount('0.001'), slippageTolerance: '1' },
      }
    );
    expect(result).toMatchObject({
      state: 'ready',
      feasible: true,
      spendableXor: '97.019',
      daiAmount: '10',
      daiIntent: '10',
      expiresAt: 31000,
      feeComponents: [{ stage: 'swap', symbol: 'XOR', amount: '0.001', included: true }],
    });
    expect(snapshot).not.toHaveBeenCalled();
    for (const key of ['burnableXor', 'estimatedTs', 'indexedThroughBlock', 'eligibleXor', 'excessXor'])
      expect(result).not.toHaveProperty(key);
  });
  it('does not charge an imaginary transaction fee for generic XOR already held', async () => {
    const snapshot = vi.fn();
    const quoteDai = vi.fn();
    const result = await requestGetTsPlanPreview(
      { source: 'xor', paymentAsset: 'XOR', amount: '1', purpose: 'xor' },
      { ...deps(), fees: {}, snapshot, quoteDai }
    );
    expect(result).toMatchObject({ state: 'ready', feasible: true, spendableXor: '1', feeComponents: [] });
    expect(snapshot).not.toHaveBeenCalled();
    expect(quoteDai).not.toHaveBeenCalled();
  });
  it('keeps generic card outcomes qualified by gas and bound to live mainnet evidence', async () => {
    const cardQuote = async () => ({ ethAmount: '0.03', totalUsd: '100', fees: [], expiresAt: 31000 });
    const result = await requestGetTsPlanPreview(
      { source: 'card', paymentAsset: 'USD', amount: '100', purpose: 'xor' },
      { ...deps(), cardQuote, conversion: async () => conversion }
    );
    expect(result).toMatchObject({
      state: 'ready',
      paymentEthAmount: '0.03',
      spendableXor: '97.019',
      costCoverage: 'partial',
    });
    expect(result.limitations).toContain('ethereum-gas');
    const checkMainnet = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    expect(await requestGetTsPlanPreview({ ...sora, purpose: 'xor' }, { ...deps(), checkMainnet })).toMatchObject({
      reason: 'mainnet',
      feasible: null,
    });
    expect(
      await requestGetTsPlanPreview({ ...sora, purpose: 'xor' }, { ...deps(), fees: { swapFeeCodec: '0' } })
    ).toMatchObject({ reason: 'fees-unavailable', state: 'unavailable' });
  });
  it('never treats zero fees or missing mainnet as free transactions', async () => {
    expect(await requestGetTsPlanPreview(sora, { ...deps(), fees: { swapFeeCodec: '0' } })).toMatchObject({
      state: 'unavailable',
      reason: 'fees-unavailable',
    });
    expect(await requestGetTsPlanPreview(sora, { ...deps(), checkMainnet: () => false })).toMatchObject({
      reason: 'mainnet',
      feasible: null,
    });
  });
  it('blocks high impact and budgets with nothing left to burn', async () => {
    expect(
      await requestGetTsPlanPreview(sora, {
        ...deps(),
        quoteDai: async () => ({ amount: amount('94'), amountWithoutImpact: amount('100') }),
      })
    ).toMatchObject({ state: 'blocked', reason: 'price-impact' });
    expect(
      await requestGetTsPlanPreview({ source: 'xor', paymentAsset: 'XOR', amount: '0.002' }, deps())
    ).toMatchObject({ state: 'blocked', reason: 'fees-insufficient' });
  });
  it('retains useful partial XOR evidence but never invents TS for stale campaign totals', async () => {
    expect(
      await requestGetTsPlanPreview(sora, {
        ...deps(),
        snapshot: async () => ({ burns: [], fresh: false, indexedThroughBlock: 0 }),
      })
    ).toMatchObject({ state: 'unavailable', reason: 'campaign-unavailable', burnableXor: '97.017' });
  });
  it('rejects campaign excess instead of advertising unrewarded burning', async () => {
    const d = deps();
    d.snapshot = async () => ({
      fresh: true,
      indexedThroughBlock: TONSWAP_START_BLOCK,
      burns: [
        {
          address: 'alice',
          amount: new FPNumber('1753356.5'),
          blockHeight: TONSWAP_START_BLOCK,
          extrinsicIndex: 0,
          txHash: `0x${'01'.repeat(32)}`,
        },
      ],
    });
    expect(await requestGetTsPlanPreview({ source: 'xor', paymentAsset: 'XOR', amount: '1.002' }, d)).toMatchObject({
      reason: 'cap-exceeded',
      feasible: false,
      excessXor: '0.5',
    });
  });
  it('gets a public EVM conversion while keeping gas separate and passing only display amounts', async () => {
    const read = vi.fn().mockResolvedValue(conversion);
    const result = await requestGetTsPlanPreview(
      { source: 'ethereum', paymentAsset: 'ETH', amount: '0.004' },
      { ...deps(), conversion: read }
    );
    expect(read).toHaveBeenCalledWith('eth', 'dai', '0.004', undefined);
    expect(result).toMatchObject({
      state: 'ready',
      costCoverage: 'partial',
      daiIntent: '9.8',
      limitations: ['indicative', 'ethereum-gas'],
    });
    expect(result).not.toHaveProperty('transaction');
    expect(result).not.toHaveProperty('fromAddress');
  });
  it('uses TON provider minimum for the second conversion and marks the external handoff', async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce({ ...conversion, outputAmount: amount('0.004'), minOutputAmount: amount('0.00392') })
      .mockResolvedValueOnce(conversion);
    const result = await requestGetTsPlanPreview(
      { source: 'ton', paymentAsset: 'USDT', amount: '10' },
      { ...deps(), conversion: read }
    );
    expect(read.mock.calls[1]).toEqual(['eth', 'dai', '0.00392', undefined]);
    expect(result.limitations).toContain('provider-handoff');
    expect(await requestGetTsPlanPreview({ source: 'ton', paymentAsset: 'TON', amount: '1' }, deps())).toMatchObject({
      state: 'unavailable',
      reason: 'native-ton',
    });
  });
  it('carries card ETH output and rejects upward provider budget clamps before conversion', async () => {
    const read = vi.fn().mockResolvedValue(conversion);
    const cardQuote = vi.fn().mockResolvedValue({ ethAmount: '0.03', totalUsd: '100', fees: [], expiresAt: 31000 });
    const result = await requestGetTsPlanPreview(
      { source: 'card', paymentAsset: 'USD', amount: '100' },
      { ...deps(), cardQuote, conversion: read }
    );
    expect(result).toMatchObject({ state: 'ready', paymentEthAmount: '0.03', daiIntent: '9.8' });
    expect(read).toHaveBeenCalledWith('eth', 'dai', '0.03', undefined);
    read.mockClear();
    expect(
      await requestGetTsPlanPreview(
        { source: 'card', paymentAsset: 'USD', amount: '10' },
        { ...deps(), cardQuote, conversion: read }
      )
    ).toMatchObject({ state: 'blocked', reason: 'card-minimum', providerMinimumUsd: '100' });
    expect(read).not.toHaveBeenCalled();
  });
  it('does not accept expired conversion evidence or a switched mainnet connection', async () => {
    expect(
      await requestGetTsPlanPreview(
        { source: 'ethereum', paymentAsset: 'USDT', amount: '10' },
        { ...deps(), conversion: async () => ({ ...conversion, expiresAt: 1000 }) }
      )
    ).toMatchObject({ reason: 'conversion-unavailable' });
    const checkMainnet = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    expect(await requestGetTsPlanPreview(sora, { ...deps(), checkMainnet })).toMatchObject({
      reason: 'mainnet',
      feasible: null,
    });
  });
  it('preserves monetary JSON lexemes without corrupting numeric text inside strings', () => {
    expect(parseGetTsQuoteJson('{"amount":0.123456789012345678,"text":"x123\\"4","n":12}')).toEqual({
      amount: '0.123456789012345678',
      text: 'x123"4',
      n: '12',
    });
    expect(() => parseGetTsQuoteJson('{"x":01}')).toThrow();
  });
  const cardJson = () => ({
    baseCurrencyCode: 'usd',
    quoteCurrencyCode: 'eth',
    paymentMethod: 'credit_debit_card',
    quoteCurrency: {
      code: 'eth',
      metadata: {
        chainId: '1',
        networkCode: 'ethereum',
        contractAddress: '0x0000000000000000000000000000000000000000',
      },
    },
    quoteCurrencyAmount: '0.033082901',
    baseCurrencyAmount: '93.06',
    feeAmount: '3.99',
    extraFeeAmount: '0.93',
    networkFeeAmount: '2.02',
    totalAmount: '100',
  });
  it('requests only the public native ETH fees-included quote with no buyer data or credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify(cardJson()) });
    vi.stubGlobal('fetch', fetcher);
    const result = await requestGetTsCardQuote('100', 'pk_live_publictest');
    const [url, options] = fetcher.mock.calls[0];
    expect(url.pathname).toBe('/v3/currencies/eth/buy_quote');
    expect(url.searchParams.get('areFeesIncluded')).toBe('true');
    expect(url.searchParams.has('walletAddress')).toBe(false);
    expect(options.credentials).toBe('omit');
    expect(result).toMatchObject({ ethAmount: '0.033082901', totalUsd: '100' });
  });
  it('rejects card quotes for different networks and inconsistent fees', async () => {
    const body = cardJson();
    body.quoteCurrency.metadata.chainId = '137';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify(body) }));
    await expect(requestGetTsCardQuote('100', 'pk_live_publictest')).rejects.toThrow('Unexpected card asset');
    body.quoteCurrency.metadata.chainId = '1';
    body.totalAmount = '99';
    await expect(requestGetTsCardQuote('100', 'pk_live_publictest')).rejects.toThrow('Inconsistent card fees');
  });
});
