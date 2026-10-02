import { describe, expect, it, vi } from 'vitest';
import { Interface, type Signer } from 'ethers';

import liveFixtures from './fixtures/tonswapConversion.json';

import {
  executeTonswapConversionQuote,
  verifyTonswapConversionReadiness,
  estimateTonswapBridgeGasReserve,
  isTonswapConversionQuoteFresh,
  requestTonswapConversionQuote,
  tonswapConversionAmountToCodec,
  TONSWAP_CONVERSION_TTL_MS,
  TONSWAP_CONVERSION_URL,
  TONSWAP_CONVERSION_UPSTREAM_URL,
  TONSWAP_CONVERSION_CONTRACTS,
  type TonswapConversionRequest,
} from '@/features/misc/lib/tonswapConversion';

const now = 1_790_310_000_000;
const wallet = '0x196A45c9ca4270bb714042b7254FbdB50277881B';
const router = '0xE7e68D336F90f98D22A479253eafA5f2424aCaD8';
const tonWallet = 'UQD1_i5tUQ-0SrKKRZf588f1CY8E9GDt20eNsH_01acgBnhB';
const request: TonswapConversionRequest = {
  source: 'usdt-ethereum',
  target: 'dai',
  amount: '100',
  fromAddress: wallet,
  toAddress: wallet,
};

/** Minimal provider fixture intentionally uses an unverified current router. */
function evmResponse() {
  const output = {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    chainId: 1,
    decimals: 18,
    symbol: 'DAI',
    amount: '99988937317100000000',
  };
  return {
    type: 'evm',
    kind: 'onchain-swap',
    tokenAmountOut: output,
    tokenAmountOutMin: { ...output, amount: '98989047943929000000' },
    priceImpact: '0.02',
    approveTo: router,
    fees: [{ value: { address: '', chainId: 1, decimals: 18, symbol: 'ETH', amount: '150000000000000' } }],
    tx: { chainId: 1, to: router, value: '150000000000000', data: '0x1234567800' },
  };
}

/** Models a TON-USDT to Ethereum ETH quote while keeping all native amounts exact. */
function tonResponse() {
  const output = { address: '', chainId: 1, decimals: 18, amount: '37108593696342050' };
  return {
    type: 'ton',
    kind: 'crosschain-swap',
    tokenAmountOut: output,
    tokenAmountOutMin: { ...output, amount: '36737322214134368' },
    priceImpact: '0.01',
    fees: [],
    tx: {
      validUntil: Math.floor(now / 1000) + 604800,
      messages: [{ address: tonWallet, amount: '200000000', payload: 'te6ccg==' }],
    },
  };
}

/** Injects a local Response, so this suite never calls the provider. */
function fetchResult(value: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(value), { status }));
}

describe('Tonswap conversion quotes', () => {
  it('encodes exact quantities and rejects zero, exponent, excess precision and uint256 overflow', () => {
    expect(tonswapConversionAmountToCodec('12.345678', 6)).toBe('12345678');
    expect(tonswapConversionAmountToCodec('0.000000000000000001', 18)).toBe('1');
    expect(tonswapConversionAmountToCodec('123456789123456789.123456789123456789', 18)).toBe(
      '123456789123456789123456789123456789'
    );
    for (const value of ['0', '-1', '1e3', '01', ' 1', '1.1234567', '9'.repeat(80)]) {
      expect(() => tonswapConversionAmountToCodec(value, 6)).toThrow('INVALID_REQUEST');
    }
    expect(() => tonswapConversionAmountToCodec('1', 19)).toThrow('INVALID_REQUEST');
  });

  it('requests only fixed assets/networks, exact input, 1% slippage, and destination-bound refunds', async () => {
    const fetch = fetchResult(evmResponse());
    const quote = await requestTonswapConversionQuote(request, { fetch, now: () => now });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(TONSWAP_CONVERSION_URL);
    expect(url).toBe('https://mof.sora.org/api/buy-xor/quote');
    expect(TONSWAP_CONVERSION_UPSTREAM_URL).toBe('https://api.symbiosis.finance/crosschain/v2/quote');
    expect(options).toMatchObject({ method: 'POST', credentials: 'omit', redirect: 'error' });
    expect(options?.headers).toEqual({ Accept: 'application/json', 'Content-Type': 'application/json' });
    expect(JSON.parse(options!.body as string)).toEqual({
      tokenAmountIn: {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        chainId: 1,
        decimals: 6,
        symbol: 'USDT',
        amount: '100000000',
      },
      tokenOut: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', chainId: 1, decimals: 18, symbol: 'DAI' },
      from: wallet,
      to: wallet,
      fallbackReceiver: wallet,
      slippage: 100,
      disabledProviders: 'open-ocean,kyber-swap,0x,bitget,uni-v4,uni-v2,uni-v3,izumi',
    });
    expect(quote).toMatchObject({
      inputAmount: '100000000',
      outputAmount: '99988937317100000000',
      minOutputAmount: '98989047943929000000',
      nativeValue: '150000000000000',
      nativeFee: '150000000000000',
      expiresAt: now + 30_000,
      approveTo: router,
      executionEnabled: false,
    });
  });

  it('rejects unsupported assets, a no-op route and invalid wallet addresses before a request', async () => {
    const fetch = fetchResult(evmResponse());
    for (const bad of [
      { ...request, source: 'ton' },
      { ...request, target: 'xor' },
      { ...request, source: 'eth', target: 'eth' },
      { ...request, fromAddress: '0x0000000000000000000000000000000000000000' },
      { ...request, toAddress: 'bad' },
      { ...request, amount: '1e18' },
    ]) {
      await expect(requestTonswapConversionQuote(bad as TonswapConversionRequest, { fetch })).rejects.toMatchObject({
        code: 'INVALID_REQUEST',
      });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects substituted output network/address/precision and zero/invalid minimum amounts', async () => {
    const mutations = [{ chainId: 56 }, { address: router }, { decimals: 6 }, { amount: '0' }, { amount: '1e18' }];
    for (const mutation of mutations) {
      const response = evmResponse();
      Object.assign(response.tokenAmountOut, mutation);
      await expect(
        requestTonswapConversionQuote(request, { fetch: fetchResult(response), now: () => now })
      ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    }
    for (const amount of ['0', '100000000000000000000', '1000000000000000000']) {
      const response = evmResponse();
      response.tokenAmountOutMin.amount = amount;
      await expect(
        requestTonswapConversionQuote(request, { fetch: fetchResult(response), now: () => now })
      ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    }
  });

  it('binds EVM value exactly to the input plus disclosed native fee and rejects excessive fees', async () => {
    const response = evmResponse();
    response.tx.value = '30150000000000000';
    const quote = await requestTonswapConversionQuote(
      { ...request, source: 'eth', amount: '0.03' },
      { fetch: fetchResult(response), now: () => now }
    );
    expect(quote.nativeFee).toBe('150000000000000');
    expect(quote.approveTo).toBeNull();
    for (const value of ['30150000000000001', '30000000000000000', '-1']) {
      response.tx.value = value;
      await expect(
        requestTonswapConversionQuote(
          { ...request, source: 'eth', amount: '0.03' },
          { fetch: fetchResult(response), now: () => now }
        )
      ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    }
    response.fees[0].value.amount = '11000000000000000';
    response.tx.value = '41000000000000000';
    await expect(
      requestTonswapConversionQuote(
        { ...request, source: 'eth', amount: '0.03' },
        { fetch: fetchResult(response), now: () => now }
      )
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('rejects wrong transaction types, chain IDs, malformed calldata, and approval addresses', async () => {
    const responses = [
      { ...evmResponse(), type: 'ton' },
      { ...evmResponse(), kind: 'crosschain-swap' },
      { ...evmResponse(), approveTo: '0x0000000000000000000000000000000000000000' },
      { ...evmResponse(), tx: { ...evmResponse().tx, chainId: 56 } },
      { ...evmResponse(), tx: { ...evmResponse().tx, data: 'javascript:alert(1)' } },
    ];
    for (const response of responses) {
      await expect(
        requestTonswapConversionQuote(request, { fetch: fetchResult(response), now: () => now })
      ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    }
  });

  it('validates TON mainnet-friendly checksum and keeps native attachment separate from USDT input', async () => {
    const fetch = fetchResult(tonResponse());
    const quote = await requestTonswapConversionQuote(
      { ...request, source: 'usdt-ton', target: 'eth', fromAddress: tonWallet },
      { fetch, now: () => now }
    );
    expect(quote).toMatchObject({
      inputAmount: '100000000',
      nativeValue: '200000000',
      nativeFee: '200000000',
      expiresAt: now + 30_000,
      executionEnabled: false,
    });
    const body = JSON.parse(fetch.mock.calls[0][1]!.body as string);
    expect(body.tokenAmountIn).toMatchObject({
      chainId: 85918,
      address: '0x9328Eb759596C38a25f59028B146Fecdc3621Dfe',
      attributes: { ton: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' },
    });
    for (const address of [tonWallet.slice(0, -1) + 'A', 'k' + tonWallet.slice(1), '0:' + '0'.repeat(64)]) {
      await expect(
        requestTonswapConversionQuote(
          { ...request, source: 'usdt-ton', fromAddress: address },
          { fetch, now: () => now }
        )
      ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    }
  });

  it('rejects excessive TON attachments, malformed payloads, and expired TON messages', async () => {
    const responses = [
      { ...tonResponse(), tx: { ...tonResponse().tx, validUntil: Math.floor(now / 1000) } },
      { ...tonResponse(), tx: { ...tonResponse().tx, messages: [] } },
      {
        ...tonResponse(),
        tx: { ...tonResponse().tx, messages: [{ address: tonWallet, amount: '1000000001', payload: 'abcd' }] },
      },
      {
        ...tonResponse(),
        tx: { ...tonResponse().tx, messages: [{ address: tonWallet, amount: '1', payload: '<script>' }] },
      },
    ];
    for (const response of responses) {
      await expect(
        requestTonswapConversionQuote(
          { ...request, source: 'usdt-ton', target: 'eth', fromAddress: tonWallet },
          { fetch: fetchResult(response), now: () => now }
        )
      ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    }
  });

  it('limits validity to thirty seconds including network time and rejects clocks moving backward', async () => {
    for (const elapsed of [30_000, -1]) {
      const clock = vi
        .fn()
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now + elapsed);
      await expect(
        requestTonswapConversionQuote(request, { fetch: fetchResult(evmResponse()), now: clock })
      ).rejects.toMatchObject({ code: 'EXPIRED' });
    }
    const quote = await requestTonswapConversionQuote(request, { fetch: fetchResult(evmResponse()), now: () => now });
    expect(isTonswapConversionQuoteFresh(quote, now)).toBe(true);
    expect(isTonswapConversionQuoteFresh(quote, now + TONSWAP_CONVERSION_TTL_MS)).toBe(false);
    expect(isTonswapConversionQuoteFresh(quote, now - 1)).toBe(false);
    expect(isTonswapConversionQuoteFresh({ ...quote, expiresAt: now + 60_000 }, now)).toBe(false);
  });

  it('maps provider failures to bounded codes without leaking provider error bodies', async () => {
    for (const [status, code] of [
      [400, 'NO_ROUTE'],
      [429, 'UNAVAILABLE'],
      [500, 'UNAVAILABLE'],
    ] as const) {
      await expect(
        requestTonswapConversionQuote(request, { fetch: fetchResult({ error: '<huge-private-error>' }, status) })
      ).rejects.toMatchObject({ message: code, code });
    }
    const controller = new AbortController();
    controller.abort();
    await expect(
      requestTonswapConversionQuote(request, {
        fetch: vi.fn().mockRejectedValue(new Error('untrusted')),
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ code: 'ABORTED' });
    await expect(
      requestTonswapConversionQuote(request, { fetch: fetchResult('x'.repeat(250_001)) })
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('never calls wallet or approval callbacks while router/payload verification is incomplete', async () => {
    const quote = await requestTonswapConversionQuote(request, { fetch: fetchResult(evmResponse()), now: () => now });
    const callback = vi.fn();
    const wallets = {
      evm: { getSigner: callback },
      ton: { getAddress: callback, getChain: callback, sendTransaction: callback },
    };
    Object.assign(quote, { executionEnabled: true });
    await expect(executeTonswapConversionQuote(quote, wallets, now)).rejects.toMatchObject({
      code: 'EXECUTION_UNAVAILABLE',
    });
    await expect(executeTonswapConversionQuote(quote, wallets, now + 30_000)).rejects.toMatchObject({
      code: 'EXPIRED',
    });
    expect(callback).not.toHaveBeenCalled();
  });
});

const outerAbi = new Interface([
  'function onswap(address token,uint256 amount,address dex,address dexgateway,bytes calldata_)',
]);
const innerAbi = new Interface([
  'function swap(address executor,(address srcToken,address dstToken,address srcReceiver,address dstReceiver,uint256 amount,uint256 minReturnAmount,uint256 flags) desc,bytes data)',
]);
const tokenAbi = new Interface(['function approve(address spender,uint256 amount) returns(bool)']);

/** Minimal wallet/provider mock with verified public runtime snapshots and no real signer. */
function signingWallet(allowance = 0n) {
  const pad = (value: bigint) => '0x' + value.toString(16).padStart(64, '0');
  const provider = {
    getNetwork: vi.fn().mockResolvedValue({ chainId: 1n }),
    getCode: vi.fn(
      async (address: string) => liveFixtures.bytecodes[address.toLowerCase() as keyof typeof liveFixtures.bytecodes]
    ),
    getFeeData: vi.fn().mockResolvedValue({ maxFeePerGas: 1_000_000_000n, gasPrice: null }),
    getBalance: vi.fn().mockResolvedValue(1_000_000_000_000_000_000n),
    call: vi.fn(async ({ data }: { data: string }) => {
      if (data.startsWith('0xddca3f43')) return pad(150000000000000n);
      if (data.startsWith('0xc79863f5'))
        return '0x' + TONSWAP_CONVERSION_CONTRACTS.executor.slice(2).toLowerCase().padStart(64, '0');
      return pad(allowance);
    }),
  };
  const signer = {
    provider,
    getAddress: vi.fn().mockResolvedValue(wallet),
    estimateGas: vi.fn().mockResolvedValue(250_000n),
    sendTransaction: vi.fn(async (transaction: { data: string; to: string; value: bigint; chainId: number }) => ({
      hash: '0x' + '1'.repeat(64),
      wait: vi.fn(async () => {
        if (transaction.data.startsWith('0x095ea7b3'))
          allowance = tokenAbi.decodeFunctionData('approve', transaction.data)[1];
        return { status: 1 };
      }),
    })),
  };
  const wallets = { evm: { getSigner: vi.fn().mockResolvedValue(signer as unknown as Signer) } };
  return { provider, signer, wallets };
}

/** Issues a quote from the captured API response so execution binds to the same immutable contents. */
async function liveQuote(source: 'eth' | 'usdt-ethereum' = 'eth') {
  return requestTonswapConversionQuote(
    { ...request, source, amount: source === 'eth' ? '0.03' : '100' },
    { fetch: fetchResult(source === 'eth' ? liveFixtures.eth : liveFixtures.usdt), now: () => now }
  );
}

describe('Tonswap checked Ethereum execution', () => {
  it('estimates an exact bridge reserve and refuses missing or nonpositive fee data', () => {
    expect(estimateTonswapBridgeGasReserve(1_000_000_000n)).toBe(196_000_000_000_000n);
    for (const price of [null, 0n, -1n])
      expect(() => estimateTonswapBridgeGasReserve(price)).toThrow('INSUFFICIENT_GAS');
  });

  it('retains the bridge reserve and conversion gas margin instead of spending the entire ETH balance', async () => {
    const cost = 30150000000000000n;
    const gasBudget = 312_500n * 1_000_000_000n;
    const reserve = 196_000n * 1_000_000_000n;
    for (const shortage of [0n, 1n, reserve]) {
      const quote = await liveQuote();
      const { wallets, signer, provider } = signingWallet();
      provider.getBalance.mockResolvedValue(cost + gasBudget + reserve - shortage);
      if (shortage) {
        await expect(executeTonswapConversionQuote(quote, wallets, () => now)).rejects.toMatchObject({
          code: 'INSUFFICIENT_GAS',
        });
        expect(signer.sendTransaction).not.toHaveBeenCalled();
      } else {
        await expect(executeTonswapConversionQuote(quote, wallets, () => now)).resolves.toBe('0x' + '1'.repeat(64));
      }
    }
  });

  it('refuses a zero gas estimate or missing live gas price before conversion signing', async () => {
    for (const unavailable of ['estimate', 'fee']) {
      const quote = await liveQuote();
      const { wallets, signer, provider } = signingWallet();
      if (unavailable === 'estimate') signer.estimateGas.mockResolvedValue(0n);
      else provider.getFeeData.mockResolvedValue({ maxFeePerGas: 0n, gasPrice: null });
      await expect(executeTonswapConversionQuote(quote, wallets, () => now)).rejects.toMatchObject({
        code: 'INSUFFICIENT_GAS',
      });
      expect(signer.sendTransaction).not.toHaveBeenCalled();
    }
  });

  it('decodes a real ETH route and sends only the checked gateway transaction after bytecode/fee validation', async () => {
    const quote = await liveQuote();
    expect(quote.executionEnabled).toBe(true);
    expect(quote.minOutputAmount).toBe('79632537160917844209');
    const { wallets, signer, provider } = signingWallet();
    expect(await executeTonswapConversionQuote(quote, wallets, () => now)).toBe('0x' + '1'.repeat(64));
    expect(provider.getCode).toHaveBeenCalledTimes(4);
    expect(signer.sendTransaction).toHaveBeenCalledExactlyOnceWith({
      chainId: 1,
      to: router,
      data: liveFixtures.eth.tx.data,
      value: 30150000000000000n,
    });
    await expect(executeTonswapConversionQuote(quote, wallets, () => now)).rejects.toMatchObject({
      code: 'EXECUTION_UNAVAILABLE',
    });
  });

  it('displays the actual calldata minimum when provider JSON overstates it, and approves only exact USDT input', async () => {
    const quote = await liveQuote('usdt-ethereum');
    expect(quote.executionEnabled).toBe(true);
    expect(quote.minOutputAmount).toBe('98971913329184776101');
    expect(BigInt(quote.minOutputAmount)).toBeLessThan(BigInt(liveFixtures.usdt.tokenAmountOutMin.amount));
    const { wallets, signer } = signingWallet();
    await executeTonswapConversionQuote(quote, wallets, () => now);
    const approval = signer.sendTransaction.mock.calls[0][0];
    expect(approval.to).toBe('0xdAC17F958D2ee523a2206206994597C13D831ec7');
    expect(tokenAbi.decodeFunctionData('approve', approval.data)).toEqual([router, 100000000n]);
    expect(signer.sendTransaction).toHaveBeenCalledTimes(2);
  });

  it('resets an existing different allowance before exact approval, while an exact allowance needs no approval', async () => {
    for (const allowance of [500000000n, 100000000n]) {
      const quote = await liveQuote('usdt-ethereum');
      const { wallets, signer } = signingWallet(allowance);
      await executeTonswapConversionQuote(quote, wallets, () => now);
      expect(signer.sendTransaction).toHaveBeenCalledTimes(allowance === 100000000n ? 1 : 3);
      if (allowance !== 100000000n) {
        expect(tokenAbi.decodeFunctionData('approve', signer.sendTransaction.mock.calls[0][0].data)[1]).toBe(0n);
        expect(tokenAbi.decodeFunctionData('approve', signer.sendTransaction.mock.calls[1][0].data)[1]).toBe(
          100000000n
        );
      }
    }
  });

  it('disables nested calldata with substituted recipient, input, token, spender, flags or minimum', async () => {
    for (const field of ['recipient', 'amount', 'token', 'spender', 'flags', 'minimum']) {
      const response = structuredClone(liveFixtures.usdt);
      const outer = outerAbi.decodeFunctionData('onswap', response.tx.data);
      const inner = innerAbi.decodeFunctionData('swap', outer.calldata_);
      const desc = Array.from(inner.desc);
      if (field === 'recipient') desc[3] = router;
      if (field === 'amount') desc[4] = 100000001n;
      if (field === 'token') desc[1] = router;
      if (field === 'flags') desc[6] = 1n;
      if (field === 'minimum') desc[5] = 1n;
      const data = innerAbi.encodeFunctionData('swap', [inner.executor, desc, inner.data]);
      response.tx.data = outerAbi.encodeFunctionData('onswap', [
        outer.token,
        outer.amount,
        outer.dex,
        field === 'spender' ? router : outer.dexgateway,
        data,
      ]);
      const quote = await requestTonswapConversionQuote(request, { fetch: fetchResult(response), now: () => now });
      expect(quote.executionEnabled).toBe(false);
    }
  });

  it('rejects mutated quote fields and never invokes the signer', async () => {
    const quote = await liveQuote();
    quote.minOutputAmount = '1';
    const { wallets } = signingWallet();
    await expect(executeTonswapConversionQuote(quote, wallets, () => now)).rejects.toMatchObject({
      code: 'EXECUTION_UNAVAILABLE',
    });
    expect(wallets.evm.getSigner).not.toHaveBeenCalled();
  });

  it('rejects changed wallet, network, contract code, gateway fee or insufficient gas before sending', async () => {
    for (const kind of ['wallet', 'network', 'code', 'fee', 'gas']) {
      const quote = await liveQuote();
      const { wallets, signer, provider } = signingWallet();
      if (kind === 'wallet') signer.getAddress.mockResolvedValue(router);
      if (kind === 'network') provider.getNetwork.mockResolvedValue({ chainId: 56n });
      if (kind === 'code') provider.getCode.mockResolvedValue('0x6000');
      if (kind === 'fee') provider.call.mockResolvedValue('0x' + '0'.repeat(63) + '1');
      if (kind === 'gas') provider.getBalance.mockResolvedValue(1n);
      await expect(executeTonswapConversionQuote(quote, wallets, () => now)).rejects.toMatchObject({
        code:
          kind === 'wallet' || kind === 'network'
            ? 'WALLET_MISMATCH'
            : kind === 'gas'
              ? 'INSUFFICIENT_GAS'
              : 'EXECUTION_UNAVAILABLE',
      });
      expect(signer.sendTransaction).not.toHaveBeenCalled();
    }
  });

  it('requires a new quote if approval confirmation outlives the quote, and preserves the confirmed approval', async () => {
    const quote = await liveQuote('usdt-ethereum');
    const { wallets, signer } = signingWallet();
    let time = now;
    signer.sendTransaction.mockResolvedValue({
      hash: '0x' + '1'.repeat(64),
      wait: vi.fn(async () => {
        time += 31_000;
        return { status: 1 };
      }),
    });
    await expect(executeTonswapConversionQuote(quote, wallets, () => time)).rejects.toMatchObject({ code: 'EXPIRED' });
    expect(signer.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it('reacquires the selected signer after approval even when the old signer still reports its cached address', async () => {
    const quote = await liveQuote('usdt-ethereum');
    const { wallets, signer } = signingWallet();
    const changedSigner = { ...signer, getAddress: vi.fn().mockResolvedValue(router) };
    signer.sendTransaction.mockResolvedValue({
      hash: '0x' + '1'.repeat(64),
      wait: vi.fn(async () => {
        wallets.evm.getSigner.mockResolvedValue(changedSigner as unknown as Signer);
        return { status: 1 };
      }),
    });
    await expect(executeTonswapConversionQuote(quote, wallets, () => now)).rejects.toMatchObject({
      code: 'WALLET_MISMATCH',
    });
    expect(await signer.getAddress()).toBe(wallet);
    expect(signer.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it('stops after approval if the UI invalidates its amount/source/liquidity generation', async () => {
    const quote = await liveQuote('usdt-ethereum');
    const { wallets, signer } = signingWallet();
    let canContinue = true;
    signer.sendTransaction.mockResolvedValue({
      hash: '0x' + '1'.repeat(64),
      wait: vi.fn(async () => {
        canContinue = false;
        return { status: 1 };
      }),
    });
    await expect(
      executeTonswapConversionQuote(quote, { ...wallets, canContinue: () => canContinue }, () => now)
    ).rejects.toMatchObject({ code: 'EXPIRED' });
    expect(signer.sendTransaction).toHaveBeenCalledTimes(1);
  });
});

describe('read-only conversion readiness', () => {
  it('checks current code, fee and enforced minimum without requesting a signer', async () => {
    const quote = await liveQuote();
    const { provider, wallets, signer } = signingWallet();
    await expect(
      verifyTonswapConversionReadiness(
        quote,
        provider as never,
        () => true,
        () => now
      )
    ).resolves.toBeUndefined();
    expect(provider.getCode).toHaveBeenCalledTimes(4);
    expect(wallets.evm.getSigner).not.toHaveBeenCalled();
    expect(signer.sendTransaction).not.toHaveBeenCalled();
  });
  it('revokes after a context change, expired quote or unknown current contract code', async () => {
    for (const kind of ['context', 'expired', 'code']) {
      const quote = await liveQuote();
      const { provider } = signingWallet();
      let current = true;
      if (kind === 'context')
        provider.getNetwork.mockImplementation(async () => {
          current = false;
          return { chainId: 1n };
        });
      if (kind === 'code') provider.getCode.mockResolvedValue('0x6000');
      await expect(
        verifyTonswapConversionReadiness(
          quote,
          provider as never,
          () => current,
          () => now + (kind === 'expired' ? 30001 : 0)
        )
      ).rejects.toMatchObject({ code: 'EXECUTION_UNAVAILABLE' });
    }
  });
});
