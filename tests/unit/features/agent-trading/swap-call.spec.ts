import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { describe, expect, it, vi } from 'vitest';

import { buildSwapCall, type SwapCallFactory } from '@/features/agent-trading/swap-call';
import type { AgentAsset, AgentAssetAmount, AgentSwapQuote } from '@/features/agent-trading/types';

function quote(): AgentSwapQuote {
  const assetIn: AgentAsset = { address: '0xin', name: 'Input', symbol: 'IN', decimals: 6 };
  const assetOut: AgentAsset = { address: '0xout', name: 'Output', symbol: 'OUT', decimals: 18 };
  const meta = (asset: AgentAsset, codec: string, value: string): AgentAssetAmount => ({
    asset: { ...asset },
    codec,
    value,
    display: value,
    decimals: asset.decimals,
  });
  return {
    quoteDigest: 'a'.repeat(64),
    request: { amount: '1.234567', side: 'input', slippageTolerance: '0.5', dexId: 'best' },
    assetIn,
    assetOut,
    dexId: 2,
    amountIn: '1.234567',
    amountOut: '9007199254740993.000000000000000001',
    amountWithoutImpact: '9007199254740993.000000000000000001',
    amountInMeta: meta(assetIn, '1234567', '1.234567'),
    amountOutMeta: meta(assetOut, '9007199254740993000000000000000001', '9007199254740993.000000000000000001'),
    amountWithoutImpactMeta: meta(
      assetOut,
      '9007199254740993000000000000000001',
      '9007199254740993.000000000000000001'
    ),
    minMaxCodec: '9007199254740992999999999999999999',
    priceImpact: '0',
    liquidityProviderFee: '0',
    rewards: [],
    route: [assetIn.address, assetOut.address],
    distribution: [],
    liquiditySources: [LiquiditySourceTypes.XYKPool],
    raw: {
      amount: '9007199254740993000000000000000001',
      amountWithoutImpact: '9007199254740993000000000000000001',
      fee: '0',
    },
  };
}

describe('unsigned exact swap call builder', () => {
  it('passes input codecs and reviewed minimum unchanged, retaining a generic factory return type', () => {
    const unsigned = { method: { toHex: () => '0x0102' }, paymentInfo: vi.fn(), signAsync: vi.fn(), send: vi.fn() };
    const factory = vi.fn<SwapCallFactory<typeof unsigned>>(() => unsigned);
    const q = quote();
    const before = JSON.stringify(q);
    expect(buildSwapCall(factory, q)).toBe(unsigned);
    expect(factory).toHaveBeenCalledExactlyOnceWith(
      2,
      '0xin',
      '0xout',
      { WithDesiredInput: { desiredAmountIn: '1234567', minAmountOut: '9007199254740992999999999999999999' } },
      [],
      'Disabled'
    );
    expect(unsigned.paymentInfo).not.toHaveBeenCalled();
    expect(unsigned.signAsync).not.toHaveBeenCalled();
    expect(unsigned.send).not.toHaveBeenCalled();
    expect(JSON.stringify(q)).toBe(before);
  });

  it('passes exact output-side amounts above 2^53 and the input-denominated maximum unchanged', () => {
    const q = quote();
    q.request.side = 'output';
    q.minMaxCodec = '1240001';
    const factory = vi.fn(() => 'unsigned');
    expect(buildSwapCall(factory, q)).toBe('unsigned');
    expect(factory).toHaveBeenCalledExactlyOnceWith(
      2,
      '0xin',
      '0xout',
      { WithDesiredOutput: { desiredAmountOut: '9007199254740993000000000000000001', maxAmountIn: '1240001' } },
      [],
      'Disabled'
    );
  });

  it('preserves low-decimal reviewed limits without recomputing slippage from display strings', () => {
    const q = quote();
    q.request.side = 'output';
    q.request.slippageTolerance = '0.123456';
    q.amountIn = '100';
    q.amountInMeta.codec = '100000000';
    q.minMaxCodec = '100123456';
    const factory = vi.fn();
    buildSwapCall(factory, q);
    expect(factory.mock.calls[0][3]).toEqual({
      WithDesiredOutput: { desiredAmountOut: q.amountOutMeta.codec, maxAmountIn: '100123456' },
    });
  });

  it.each(Object.values(LiquiditySourceTypes))('preserves explicit %s source selection', (source) => {
    const q = quote();
    q.request.liquiditySource = source;
    const factory = vi.fn();
    buildSwapCall(factory, q);
    expect(factory.mock.calls[0].slice(4)).toEqual(
      source === LiquiditySourceTypes.Default ? [[], 'Disabled'] : [[source], 'AllowSelected']
    );
  });

  it('permits a zero input-side minimum as an explicit codec bound without fabricating a positive value', () => {
    const q = quote();
    q.minMaxCodec = '0';
    const factory = vi.fn();
    buildSwapCall(factory, q);
    expect(factory.mock.calls[0][3]).toEqual({ WithDesiredInput: { desiredAmountIn: '1234567', minAmountOut: '0' } });
  });

  it.each(['', '01', '-1', '1.0', '1e18', ' 1', '1 ', 'NaN', '9'.repeat(121), 1, null, undefined])(
    'rejects malformed limit %s before constructing any call',
    (value) => {
      const q = quote();
      q.minMaxCodec = value as string;
      const factory = vi.fn();
      expect(() => buildSwapCall(factory, q)).toThrow();
      expect(factory).not.toHaveBeenCalled();
    }
  );

  it.each(['input', 'output'] as const)('requires a positive %s amount', (side) => {
    const q = quote();
    q.request.side = side;
    q[side === 'input' ? 'amountInMeta' : 'amountOutMeta'].codec = '0';
    const factory = vi.fn();
    expect(() => buildSwapCall(factory, q)).toThrow();
    expect(factory).not.toHaveBeenCalled();
  });

  it('rejects a zero output-side maximum', () => {
    const q = quote();
    q.request.side = 'output';
    q.minMaxCodec = '0';
    const factory = vi.fn();
    expect(() => buildSwapCall(factory, q)).toThrow();
    expect(factory).not.toHaveBeenCalled();
  });

  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, '2'])(
    'rejects unresolved or unsafe DEX %s',
    (dexId) => {
      const q = quote();
      q.dexId = dexId as number;
      const factory = vi.fn();
      expect(() => buildSwapCall(factory, q)).toThrow();
      expect(factory).not.toHaveBeenCalled();
    }
  );

  it.each(['', 'buy', undefined, null])('rejects unsupported side %s without guessing a default', (side) => {
    const q = quote();
    q.request.side = side as AgentSwapQuote['request']['side'];
    const factory = vi.fn();
    expect(() => buildSwapCall(factory, q)).toThrow();
    expect(factory).not.toHaveBeenCalled();
  });

  it.each(['UnknownPool', ' XYKPool', 'xykpool', null, 1])('rejects unsupported source %s', (source) => {
    const q = quote();
    q.request.liquiditySource = source as LiquiditySourceTypes;
    const factory = vi.fn();
    expect(() => buildSwapCall(factory, q)).toThrow();
    expect(factory).not.toHaveBeenCalled();
  });

  it.each(['', ' ', '0xin\n', '0xin\u0000', 'x'.repeat(257)])('rejects malformed asset address %s', (address) => {
    const q = quote();
    q.assetIn.address = address;
    const factory = vi.fn();
    expect(() => buildSwapCall(factory, q)).toThrow();
    expect(factory).not.toHaveBeenCalled();
  });

  it.each([
    (q: AgentSwapQuote) => {
      q.assetOut.address = q.assetIn.address;
    },
    (q: AgentSwapQuote) => {
      q.amountInMeta.asset.address = '0xother';
    },
    (q: AgentSwapQuote) => {
      q.amountOutMeta.decimals = 6;
    },
    (q: AgentSwapQuote) => {
      q.amountOutMeta.asset.decimals = 6;
    },
    (q: AgentSwapQuote) => {
      q.assetIn.decimals = -1;
    },
    (q: AgentSwapQuote) => {
      q.assetIn.decimals = 1.5;
    },
    (q: AgentSwapQuote) => {
      q.assetIn.decimals = 256;
    },
  ])('rejects inconsistent or invalid asset precision metadata %#', (mutate) => {
    const q = quote();
    mutate(q);
    const factory = vi.fn();
    expect(() => buildSwapCall(factory, q)).toThrow();
    expect(factory).not.toHaveBeenCalled();
  });
});
