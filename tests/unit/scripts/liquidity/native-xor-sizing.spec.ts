import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertModelMatches,
  balancedDeposit,
  collectNativeXorSizing,
  nativeAmount,
  outputFeeQuote,
  positiveCodec,
} from '../../../../scripts/liquidity/native-xor-sizing.mjs';

const UNIT = 10n ** 18n;
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const DAI = '0x0200060000000000000000000000000000000000000000000000000000000000';

vi.mock('@polkadot/api', () => ({ ApiPromise: { create: vi.fn() }, HttpProvider: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

describe('read-only native XOR liquidity sizing', () => {
  it('preserves exact codec precision and rejects malformed monetary values', () => {
    expect(positiveCodec('1234567000000000000')).toBe(1234567000000000000n);
    expect(nativeAmount(1234567000000000000n)).toBe('1.234567');
    expect(nativeAmount(1n)).toBe('0.000000000000000001');
    for (const input of ['0', '-1', '1e18', '1.5', '9'.repeat(79)]) expect(() => positiveCodec(input)).toThrow();
  });

  it('sizes balanced reserves at the exact five-percent and three-percent boundaries', () => {
    const sized = balancedDeposit(100n * UNIT, 400n * UNIT, 80n * UNIT, 500n);
    expect(sized).toMatchObject({
      requiredDai: 1900n * UNIT,
      addDai: 1500n * UNIT,
      addXor: 300n * UNIT,
      spotMarkedDaiCapital: 3000n * UNIT,
    });
    expect(sized.xorOutput).toBe((18886n * UNIT) / 1000n);
    const three = balancedDeposit(100n * UNIT, 400n * UNIT, 80n * UNIT, 300n);
    expect(three.requiredDai).toBe(3233333333333333333334n);
    expect(100n * UNIT * 10000n <= 300n * (three.requiredDai + 100n * UNIT)).toBe(true);
  });

  it('does not request a deposit for already sufficient reserves and rejects invalid limits', () => {
    expect(balancedDeposit(1n * UNIT, 400n * UNIT, 80n * UNIT, 500n).addDai).toBe(0n);
    expect(() => balancedDeposit(UNIT, 0n, UNIT, 500n)).toThrow();
    expect(() => balancedDeposit(UNIT, UNIT, UNIT, 10000n)).toThrow();
    expect(() => balancedDeposit(UNIT, UNIT, UNIT, 0n)).toThrow();
  });

  it('refuses extrapolation when aggregate routing, fees or pool math differ', () => {
    const expected = outputFeeQuote(100n * UNIT, 400n * UNIT, 80n * UNIT);
    const quote = {
      amount: expected.amount.toString(),
      amount_without_impact: expected.withoutImpact.toString(),
      fee: { [XOR]: expected.fee.toString() },
      route: [DAI, XOR],
    };
    expect(assertModelMatches(quote, 100n * UNIT, 400n * UNIT, 80n * UNIT)).toBe(true);
    expect(() =>
      assertModelMatches({ ...quote, route: [DAI, 'other', XOR] }, 100n * UNIT, 400n * UNIT, 80n * UNIT)
    ).toThrow();
    expect(() =>
      assertModelMatches({ ...quote, amount: (expected.amount + 3n).toString() }, 100n * UNIT, 400n * UNIT, 80n * UNIT)
    ).toThrow();
    expect(() => assertModelMatches({ ...quote, fee: {} }, 100n * UNIT, 400n * UNIT, 80n * UNIT)).toThrow();
  });

  it('pins every public quote to the finalized snapshot and produces no signing calls', async () => {
    const { ApiPromise } = await import('@polkadot/api');
    const hash = `0x${'a'.repeat(64)}`;
    const codec = (value: string) => ({ toString: () => value });
    const snapshot = {
      runtimeVersion: { toJSON: () => ({ specVersion: 131 }) },
      query: {
        poolXYK: {
          reserves: vi.fn().mockResolvedValue([codec((80n * UNIT).toString()), codec((400n * UNIT).toString())]),
          properties: vi.fn().mockResolvedValue({ toJSON: () => ['pool', 'fee'] }),
        },
        assets: { assetInfosV2: vi.fn().mockResolvedValue({ precision: codec('18') }) },
        denomination: { denominator: vi.fn().mockResolvedValue(codec('1')) },
        orderBook: { orderBooks: vi.fn().mockResolvedValue({ toJSON: () => null }) },
      },
    };
    const api = {
      genesisHash: { toHex: () => '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5' },
      rpc: {
        chain: {
          getFinalizedHead: vi.fn().mockResolvedValue({ toHex: () => hash }),
          getHeader: vi.fn().mockResolvedValue({ number: codec('123') }),
        },
      },
      at: vi.fn().mockResolvedValue(snapshot),
      disconnect: vi.fn(),
    };
    vi.mocked(ApiPromise.create).mockResolvedValue(api as never);
    const requests: { method: string; params: unknown[] }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options: RequestInit) => {
        const request = JSON.parse(String(options.body));
        requests.push(request);
        let result;
        if (request.method === 'liquidityProxy_listEnabledSourcesForPath') result = ['XYKPool', 'OrderBook'];
        else {
          const quote = outputFeeQuote(BigInt(request.params[3]), 400n * UNIT, 80n * UNIT);
          result = {
            amount: quote.amount.toString(),
            amount_without_impact: quote.withoutImpact.toString(),
            fee: { [XOR]: quote.fee.toString() },
            route: [DAI, XOR],
          };
        }
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }), { status: 200 });
      })
    );
    const result = await collectNativeXorSizing();
    expect(result.modelVerified).toBe(true);
    expect(result.sizing).toHaveLength(4);
    expect(result.at).toBe(hash);
    expect(requests).toHaveLength(9);
    expect(requests.every((request) => request.params.at(-1) === hash)).toBe(true);
    expect(new Set(requests.map((request) => request.method))).toEqual(
      new Set(['liquidityProxy_quote', 'liquidityProxy_listEnabledSourcesForPath'])
    );
    expect(api.disconnect).toHaveBeenCalledOnce();
  });

  it('rejects another chain and closes the read connection before any quote', async () => {
    const { ApiPromise } = await import('@polkadot/api');
    const disconnect = vi.fn();
    vi.mocked(ApiPromise.create).mockResolvedValue({
      genesisHash: { toHex: () => `0x${'b'.repeat(64)}` },
      disconnect,
    } as never);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(collectNativeXorSizing()).rejects.toThrow('Wrong mainnet');
    expect(fetch).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
