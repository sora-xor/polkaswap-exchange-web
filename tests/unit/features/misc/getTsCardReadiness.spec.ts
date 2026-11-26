import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeAddress } from '@polkadot/util-crypto';
import { FPNumber } from '@sora-substrate/sdk';
import {
  requestGetTsCardReadiness,
  estimateGetTsCardConversionGas,
  estimateGetTsCardBridgeGas,
  estimateGetTsCardEthBridgeGas,
  GET_TS_CARD_DAI,
  GET_TS_HASHI_DAI_BRIDGE,
  type GetTsCardReadinessDependencies,
} from '@/features/misc/lib/getTsCardReadiness';
import type { TonswapConversionQuote, TonswapConversionRequest } from '@/features/misc/lib/tonswapConversion';

vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: { connection: null } }));
vi.unmock('@polkadot/util-crypto');
const account = '0x1111111111111111111111111111111111111111';
const soraAccount = encodeAddress(new Uint8Array(32).fill(7), 69);
const started = 1_790_310_000_000;
const codec = (amount: string) => new FPNumber(amount).toCodecString();
/** Get TS converts the card's ETH to DAI first; Buy XOR's ETH route has its own suite below. */
const request = { amount: '25', account, soraAccount, publicKey: 'pk_live_test', purpose: 'ts' as const };
function quote(value: TonswapConversionRequest): TonswapConversionQuote {
  const inputAmount = codec(value.amount);
  return {
    request: value,
    inputAmount,
    outputAmount: codec('25'),
    minOutputAmount: codec('24.75'),
    outputDecimals: 18,
    priceImpactPercent: '0.1',
    fees: [],
    nativeValue: (BigInt(inputAmount) + 150_000_000_000_000n).toString(),
    nativeFee: '150000000000000',
    quotedAt: started,
    expiresAt: started + 30000,
    approveTo: null,
    executionEnabled: true,
    executionReason: null,
    transaction: {
      type: 'evm',
      chainId: 1,
      to: '0xe7e68d336f90f98d22a479253eafa5f2424acad8',
      data: '0x12345678',
      value: (BigInt(inputAmount) + 150_000_000_000_000n).toString(),
    },
  };
}
function dependencies(): GetTsCardReadinessDependencies {
  return {
    provider: {
      send: vi.fn(async (method) => (method === 'eth_chainId' ? '0x1' : [account])),
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1n }),
      getFeeData: vi.fn().mockResolvedValue({ maxFeePerGas: 1_000_000_000n }),
      getBalance: vi.fn().mockResolvedValue(0n),
      getCode: vi.fn(),
      call: vi.fn().mockResolvedValue(`0x${150_000_000_000_000n.toString(16).padStart(64, '0')}`),
    } as unknown as GetTsCardReadinessDependencies['provider'],
    isCurrent: () => true,
    bridgeReady: vi.fn().mockResolvedValue(true),
    plan: { fees: { swapFeeCodec: codec('0.01'), slippageTolerance: '0.5' } },
    now: () => started,
    cardQuote: vi.fn().mockResolvedValue({
      ethAmount: '0.01',
      totalUsd: '25',
      fees: [{ amount: '4.5', symbol: 'USD', stage: 'provider', included: true }],
      expiresAt: started + 30000,
    }),
    conversionQuote: vi.fn(async (value) => quote(value)),
    verifyConversion: vi.fn().mockResolvedValue(undefined),
    estimateConversion: vi.fn().mockResolvedValue(100_000n),
    estimateBridge: vi.fn().mockResolvedValue(80_000n),
    preview: vi.fn(async (value) => ({
      ...value,
      state: 'ready',
      feasible: true,
      expiresAt: started + 30000,
      costCoverage: 'complete',
      limitations: [],
      feeComponents: [{ stage: 'swap', amount: '0.01', symbol: 'XOR', included: true }],
      spendableXor: '3.2',
      priceImpact: '1',
    })),
  };
}

describe('before-card full-route readiness', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('covers conversion, Hashi and native swap costs entirely from delivered ETH for a zero-balance account', async () => {
    const deps = dependencies();
    const result = await requestGetTsCardReadiness(request, deps);
    expect(result).toMatchObject({
      allowed: true,
      amount: '25',
      deliveredEth: '0.01',
      existingEth: '0',
      conversionEth: '0.009454',
      conversionGasReserve: '0.0002',
      bridgeGasReserve: '0.000196',
      ethereumGasReserve: '0.000396',
      conversionProviderFee: '0.00015',
      bridgeDaiFee: '0',
      daiAmount: '24.75',
      nativeFeeReserve: '0.01',
      spendableXor: '3.2',
      bridgeEstimate: 'simulated',
    });
    expect(deps.conversionQuote).toHaveBeenLastCalledWith(
      expect.objectContaining({ amount: '0.009454', fromAddress: account, toAddress: account }),
      expect.any(AbortSignal)
    );
    expect(deps.estimateConversion).toHaveBeenCalledWith(expect.any(Object), 10_000_000_000_000_000n);
    expect(deps.preview).toHaveBeenCalledWith(
      { source: 'sora', purpose: 'ts', paymentAsset: 'DAI', amount: '24.75' },
      expect.any(Object)
    );
    expect(result).toMatchObject({ swapAsset: 'DAI', swapAmount: '24.75' });
    expect(result).not.toHaveProperty('account');
    expect(result).not.toHaveProperty('transaction');
  });
  it('starts from the reserve-adjusted budget instead of an artificial below-minimum half purchase', async () => {
    const deps = dependencies();
    vi.mocked(deps.conversionQuote!).mockImplementation(async (value) => {
      if (new FPNumber(value.amount).lt(new FPNumber('0.009'))) throw new Error('minimum');
      return quote(value);
    });
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({ allowed: true });
    expect(deps.conversionQuote).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ amount: '0.009054' }),
      expect.any(AbortSignal)
    );
  });
  it('keeps trailing-zero USD lexemes while checking numeric budget equality', async () => {
    expect(await requestGetTsCardReadiness({ ...request, amount: '25.00' }, dependencies())).toMatchObject({
      allowed: true,
      amount: '25.00',
    });
  });
  it('rounds reserves upward so tiny calldata gas changes do not churn an affordable input forever', async () => {
    const deps = dependencies();
    vi.mocked(deps.estimateConversion!)
      .mockResolvedValueOnce(100_001n)
      .mockResolvedValueOnce(100_005n)
      .mockResolvedValue(100_010n);
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({
      allowed: true,
      conversionGasReserve: '0.00022',
      conversionEth: '0.009434',
    });
    expect(deps.conversionQuote).toHaveBeenCalledTimes(2);
  });
  it('fails closed when repeated gas growth exhausts the bounded quote loop', async () => {
    const deps = dependencies();
    vi.mocked(deps.estimateConversion!)
      .mockResolvedValueOnce(100_000n)
      .mockResolvedValueOnce(200_000n)
      .mockResolvedValueOnce(300_000n);
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({ allowed: false });
    expect(deps.conversionQuote).toHaveBeenCalledTimes(3);
    expect(deps.preview).not.toHaveBeenCalled();
  });
  it('does not spend the existing wallet balance or hide it inside the card budget', async () => {
    const deps = dependencies();
    vi.mocked(deps.provider.getBalance).mockResolvedValue(100_000_000_000_000_000_000n);
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({
      allowed: true,
      existingEth: '100',
      conversionEth: '0.009454',
    });
    vi.mocked(deps.cardQuote!).mockResolvedValue({
      ethAmount: '0.0001',
      totalUsd: '25',
      fees: [],
      expiresAt: started + 30000,
    });
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({ allowed: false, reason: 'budget' });
  });
  it('requotes a reduced exact input when full-size conversion gas exceeds the initial estimate', async () => {
    const deps = dependencies();
    vi.mocked(deps.estimateConversion!).mockResolvedValueOnce(100_000n).mockResolvedValue(110_000n);
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({
      allowed: true,
      conversionEth: '0.009434',
      conversionGasReserve: '0.00022',
    });
    expect(deps.conversionQuote).toHaveBeenCalledTimes(3);
  });
  it('increases the existing bridge floor for a more costly exact approval/transfer simulation', async () => {
    const deps = dependencies();
    vi.mocked(deps.estimateBridge!).mockResolvedValue(120_000n);
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({
      allowed: true,
      conversionEth: '0.00941',
      bridgeGasReserve: '0.00024',
    });
  });
  it('retains the conservative bridge reserve only when the optional simulation explicitly reports unsupported', async () => {
    const deps = dependencies();
    vi.mocked(deps.estimateBridge!).mockResolvedValue(null);
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({
      allowed: true,
      bridgeEstimate: 'reserve',
      bridgeGasReserve: '0.000196',
    });
    vi.mocked(deps.estimateBridge!).mockRejectedValue(new Error('revert'));
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({ allowed: false, reason: 'bridge' });
  });
  it.each(['24.99', '25.01'])('requires the exact locked USD budget, not provider amount %s', async (totalUsd) => {
    const deps = dependencies();
    vi.mocked(deps.cardQuote!).mockResolvedValue({ ethAmount: '0.01', totalUsd, fees: [], expiresAt: started + 30000 });
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({ allowed: false, reason: 'provider' });
    expect(deps.conversionQuote).not.toHaveBeenCalled();
  });
  it('fails closed for unknown/zero gas, unavailable simulation and invalid native fee output', async () => {
    for (const price of [null, 0n]) {
      const deps = dependencies();
      vi.mocked(deps.provider.getFeeData).mockResolvedValue({ maxFeePerGas: price, gasPrice: null } as never);
      expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({ allowed: false, reason: 'gas' });
    }
    const deps = dependencies();
    vi.mocked(deps.estimateConversion!).mockRejectedValue(new Error('unsupported'));
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({ allowed: false, reason: 'simulation' });
  });
  it('rejects wallet/mainnet changes, unregistered or migrating bridges and unsupported conversions', async () => {
    const deps = dependencies();
    vi.mocked(deps.provider.send).mockResolvedValue('0x2');
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({ allowed: false, reason: 'wallet' });
    const bridge = dependencies();
    vi.mocked(bridge.bridgeReady).mockResolvedValue(false);
    expect(await requestGetTsCardReadiness(request, bridge)).toMatchObject({ allowed: false, reason: 'bridge' });
    const conversion = dependencies();
    vi.mocked(conversion.verifyConversion!).mockRejectedValue(new Error('unknown bytecode'));
    expect(await requestGetTsCardReadiness(request, conversion)).toMatchObject({
      allowed: false,
      reason: 'conversion',
    });
  });
  it('revokes late results when the account or native fee context changes during a read', async () => {
    const deps = dependencies();
    let current = true;
    deps.isCurrent = () => current;
    vi.mocked(deps.preview!).mockImplementation(async (value) => {
      current = false;
      return { ...value, state: 'ready', feasible: true } as never;
    });
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({ allowed: false, expiresAt: 0 });
  });
  it('rejects liquidity failures, expired card output and greater than 5% conversion price impact', async () => {
    const deps = dependencies();
    vi.mocked(deps.preview!).mockResolvedValue({ state: 'blocked', feasible: false } as never);
    expect(await requestGetTsCardReadiness(request, deps)).toMatchObject({ allowed: false, reason: 'liquidity' });
    const stale = dependencies();
    vi.mocked(stale.cardQuote!).mockResolvedValue({ ethAmount: '0.01', totalUsd: '25', fees: [], expiresAt: started });
    expect(await requestGetTsCardReadiness(request, stale)).toMatchObject({ allowed: false, reason: 'expired' });
    const high = dependencies();
    vi.mocked(high.conversionQuote!).mockImplementation(async (value) => ({
      ...quote(value),
      priceImpactPercent: '5.01',
    }));
    expect(await requestGetTsCardReadiness(request, high)).toMatchObject({ allowed: false, reason: 'conversion' });
  });
  it('uses purpose-specific downstream fee/campaign policy and never labels generic output as TS', async () => {
    const deps = dependencies();
    await requestGetTsCardReadiness(request, deps);
    expect(deps.preview).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'ts' }), expect.any(Object));
    const xor = dependencies();
    xor.estimateEthBridge = vi.fn().mockResolvedValue(26_100n);
    await requestGetTsCardReadiness({ ...request, purpose: 'xor' }, xor);
    expect(xor.preview).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'xor' }), expect.any(Object));
  });
  it('bounds hung wallet reads and cancels stale work without any signing method', async () => {
    vi.useFakeTimers();
    try {
      const deps = dependencies();
      vi.mocked(deps.provider.send).mockImplementation(() => new Promise(() => undefined));
      const result = requestGetTsCardReadiness(request, deps);
      await vi.advanceTimersByTimeAsync(30001);
      expect(await result).toMatchObject({ allowed: false, reason: 'expired' });
    } finally {
      vi.useRealTimers();
    }
  });
});

function rpcFixture(result: unknown, error?: object) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, ...(error ? { error } : { result }) }), { status: 200 });
}
function simulationProvider() {
  const deps = dependencies();
  const hash = `0x${'a'.repeat(64)}`;
  vi.mocked(deps.provider.send).mockImplementation(async (method) => {
    if (method === 'eth_getBlockByNumber') return { hash };
    throw new Error('Wallet cannot forward overrides');
  });
  const fetcher = vi.fn(async (_url: unknown, init: RequestInit) => {
    const call = JSON.parse(init.body as string);
    if (call.method === 'eth_chainId') return rpcFixture('0x1');
    if (call.method === 'eth_getBlockByNumber')
      return rpcFixture({ number: '0x100', hash, timestamp: `0x${Math.floor(Date.now() / 1000).toString(16)}` });
    if (call.method === 'eth_estimateGas') return rpcFixture('0x186a0');
    return rpcFixture([
      {
        calls: [
          { status: '0x1', gasUsed: '0x186a0' },
          { status: '0x1', gasUsed: '0xafc8' },
          { status: '0x1', gasUsed: '0xcf08' },
        ],
      },
    ]);
  });
  vi.stubGlobal('fetch', fetcher);
  return { provider: deps.provider, fetcher };
}

describe('read-only before-card simulation', () => {
  afterEach(() => vi.unstubAllGlobals());
  const q = quote({ source: 'eth', target: 'dai', amount: '0.005', fromAddress: account, toAddress: account });
  it('uses the exact calldata and delivered balance, without a signer or fabricated token storage', async () => {
    const { provider, fetcher } = simulationProvider();
    expect(await estimateGetTsCardConversionGas(provider, q, 10n ** 16n, new AbortController().signal)).toBe(100_000n);
    const call = JSON.parse(fetcher.mock.calls.at(-1)![1].body as string);
    expect(call).toMatchObject({
      method: 'eth_estimateGas',
      params: [
        { from: account, to: q.transaction.type === 'evm' ? q.transaction.to : '', data: '0x12345678' },
        '0x100',
        { [account]: { balance: '0x2386f26fc10000' } },
      ],
    });
    expect(JSON.stringify(call)).not.toContain('stateDiff');
  });
  it('simulates exact approval then Hashi transfer after the actual conversion', async () => {
    const { provider, fetcher } = simulationProvider();
    expect(await estimateGetTsCardBridgeGas(provider, q, 10n ** 16n, soraAccount, new AbortController().signal)).toBe(
      98_000n
    );
    const call = JSON.parse(fetcher.mock.calls.at(-1)![1].body as string);
    expect(call.method).toBe('eth_simulateV1');
    expect(call.params[0].blockStateCalls[0].calls).toMatchObject([
      { from: account, data: '0x12345678' },
      { from: account, to: GET_TS_CARD_DAI, value: '0x0' },
      { from: account, to: GET_TS_HASHI_DAI_BRIDGE, value: '0x0' },
    ]);
  });
  it('rejects a different public network/fork and failed bridge simulation instead of treating it as zero cost', async () => {
    const { provider } = simulationProvider();
    vi.mocked(provider.send).mockResolvedValue({ hash: `0x${'b'.repeat(64)}` });
    await expect(
      estimateGetTsCardBridgeGas(provider, q, 10n ** 16n, soraAccount, new AbortController().signal)
    ).rejects.toThrow('fork');
    const next = simulationProvider();
    next.fetcher.mockImplementationOnce(async () => rpcFixture('0x2'));
    await expect(
      estimateGetTsCardBridgeGas(next.provider, q, 10n ** 16n, soraAccount, new AbortController().signal)
    ).rejects.toThrow('network');
  });
  it('permits the baseline only for explicit method unsupported, not revert/invalid-params failures', async () => {
    for (const code of [-32601, -32602, 3]) {
      const { provider, fetcher } = simulationProvider();
      const fallback = fetcher.getMockImplementation()!;
      fetcher.mockImplementation(async (url, init) =>
        JSON.parse(init.body as string).method === 'eth_simulateV1' ? rpcFixture(null, { code }) : fallback(url, init)
      );
      const value = estimateGetTsCardBridgeGas(provider, q, 10n ** 16n, soraAccount, new AbortController().signal);
      if (code === -32601) await expect(value).resolves.toBeNull();
      else await expect(value).rejects.toThrow();
    }
  });
});

describe('Buy XOR card readiness: the ETH goes to SORA as it is', () => {
  const xorRequest = { ...request, purpose: 'xor' as const };
  function ethDependencies() {
    const deps = dependencies();
    deps.estimateEthBridge = vi.fn().mockResolvedValue(26_100n);
    return deps;
  }

  it('reserves only the bridge transfer gas from the delivered ETH, with no conversion and no DAI', async () => {
    const deps = ethDependencies();
    const result = await requestGetTsCardReadiness(xorRequest, deps);
    // 26,100 gas rounds up to 30,000 and is doubled: 60,000 gas at 1 gwei.
    expect(result).toMatchObject({
      allowed: true,
      deliveredEth: '0.01',
      conversionEth: '0.00994',
      swapAsset: 'ETH',
      swapAmount: '0.00994',
      bridgeGasReserve: '0.00006',
      ethereumGasReserve: '0.00006',
      conversionGasReserve: '0',
      conversionProviderFee: '0',
      bridgeEstimate: 'simulated',
      spendableXor: '3.2',
      priceImpact: '1',
    });
    expect(result.daiAmount).toBeUndefined();
    expect(deps.estimateEthBridge).toHaveBeenCalledWith(9_940_000_000_000_000n, 10_000_000_000_000_000n, soraAccount);
    expect(deps.preview).toHaveBeenCalledWith(
      { source: 'sora', purpose: 'xor', paymentAsset: 'ETH', amount: '0.00994' },
      expect.any(Object)
    );
    // Nothing about the Ethereum DAI conversion is read.
    expect(deps.conversionQuote).not.toHaveBeenCalled();
    expect(deps.estimateConversion).not.toHaveBeenCalled();
    expect(deps.estimateBridge).not.toHaveBeenCalled();
    expect(deps.provider.call).not.toHaveBeenCalled();
  });

  it('stops before payment when the transfer cannot be simulated, the card ETH cannot pay its gas, or SORA cannot take it', async () => {
    const simulation = ethDependencies();
    vi.mocked(simulation.estimateEthBridge!).mockRejectedValue(new Error('revert'));
    expect(await requestGetTsCardReadiness(xorRequest, simulation)).toMatchObject({
      allowed: false,
      reason: 'simulation',
    });
    const odd = ethDependencies();
    vi.mocked(odd.estimateEthBridge!).mockResolvedValue(500_000n);
    expect(await requestGetTsCardReadiness(xorRequest, odd)).toMatchObject({ allowed: false });
    const tiny = ethDependencies();
    vi.mocked(tiny.cardQuote!).mockResolvedValue({
      ethAmount: '0.00001',
      totalUsd: '25',
      fees: [],
      expiresAt: started + 30000,
    });
    expect(await requestGetTsCardReadiness(xorRequest, tiny)).toMatchObject({ allowed: false, reason: 'budget' });
    const blocked = ethDependencies();
    vi.mocked(blocked.preview!).mockResolvedValue({ state: 'blocked', feasible: false } as never);
    expect(await requestGetTsCardReadiness(xorRequest, blocked)).toMatchObject({
      allowed: false,
      reason: 'liquidity',
    });
  });

  it('estimates the exact sendEthToSidechain call to the SORA account with a funded balance override', async () => {
    const deps = dependencies();
    vi.mocked(deps.provider.send).mockResolvedValue('0x65f4');
    const gas = await estimateGetTsCardEthBridgeGas(
      deps.provider,
      account,
      soraAccount,
      9_940_000_000_000_000n,
      10n ** 16n,
      new AbortController().signal
    );
    expect(gas).toBe(26_100n);
    const [method, [transaction, block, overrides]] = vi.mocked(deps.provider.send).mock.calls[0] as [
      string,
      [{ from: string; to: string; data: string; value: string }, string, Record<string, { balance: string }>],
    ];
    expect(method).toBe('eth_estimateGas');
    expect(block).toBe('latest');
    expect(transaction).toMatchObject({ from: account, to: GET_TS_HASHI_DAI_BRIDGE, value: '0x23506099114000' });
    // sendEthToSidechain(bytes32): the SORA account's public key, here 32 bytes of 7.
    expect(transaction.data).toBe(`0xfdfba25d${'07'.repeat(32)}`);
    expect(overrides).toEqual({ [account]: { balance: '0x2386f26fc10000' } });
  });

  it('falls back to the checked public read when the wallet cannot forward overrides, and rejects odd gas', async () => {
    const { provider, fetcher } = simulationProvider();
    expect(
      await estimateGetTsCardEthBridgeGas(
        provider,
        account,
        soraAccount,
        10n ** 15n,
        10n ** 16n,
        new AbortController().signal
      )
    ).toBe(100_000n);
    expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body as string).method).toBe('eth_estimateGas');
    const deps = dependencies();
    vi.mocked(deps.provider.send).mockResolvedValue('0x1');
    await expect(
      estimateGetTsCardEthBridgeGas(deps.provider, account, soraAccount, 1n, 10n ** 16n, new AbortController().signal)
    ).rejects.toThrow('Invalid bridge gas');
  });
});
