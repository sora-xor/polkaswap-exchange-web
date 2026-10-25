/** Read-only native XOR liquidity sizing. No wallet, signing, order or transaction APIs are called. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ENDPOINT = 'https://ws.mof.sora.org/';
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const DAI = '0x0200060000000000000000000000000000000000000000000000000000000000';
const UNIT = 10n ** 18n;

/** Convert a bounded positive integer codec without floating-point coercion. */
export function positiveCodec(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,77}$/.test(value)) throw new Error('Invalid positive codec');
  return BigInt(value);
}

/** Format exact 18-decimal native units; this does not apply a bridge/business denomination. */
export function nativeAmount(value) {
  if (typeof value !== 'bigint' || value < 0n) throw new Error('Invalid native amount');
  const fraction = (value % UNIT).toString().padStart(18, '0').replace(/0+$/, '');
  return `${value / UNIT}${fraction ? `.${fraction}` : ''}`;
}

/** DAI -> XOR XYK model: constant product, 0.6% fee deducted from XOR output. */
export function outputFeeQuote(input, daiReserve, xorReserve) {
  for (const amount of [input, daiReserve, xorReserve]) if (amount <= 0n) throw new Error('Positive reserves required');
  const gross = (input * xorReserve) / (daiReserve + input);
  const fee = (gross * 6n + 999n) / 1000n;
  // The runtime truncates the fixed-point spot ratio before multiplying the input.
  const baselineGross = (input * ((xorReserve * UNIT) / daiReserve)) / UNIT;
  return { amount: gross - fee, fee, withoutImpact: (baselineGross * 994n) / 1000n };
}

/** Require the actual two-asset router result to agree with the model within codec rounding only. */
export function assertModelMatches(quote, input, daiReserve, xorReserve) {
  if (!quote || JSON.stringify(quote.route) !== JSON.stringify([DAI, XOR])) throw new Error('Non-direct route');
  if (JSON.stringify(Object.keys(quote.fee ?? {})) !== JSON.stringify([XOR])) throw new Error('Unexpected fee asset');
  const modeled = outputFeeQuote(input, daiReserve, xorReserve);
  const actual = {
    amount: positiveCodec(quote.amount),
    fee: positiveCodec(quote.fee?.[XOR]),
    withoutImpact: positiveCodec(quote.amount_without_impact),
  };
  for (const key of Object.keys(modeled)) {
    const difference = actual[key] - modeled[key];
    if (difference < -2n || difference > 2n) throw new Error(`XYK model mismatch: ${key}`);
  }
  return true;
}

/** Balanced deposit preserving spot price; derives R >= input * (1-impact)/impact, rounding up. */
export function balancedDeposit(input, daiReserve, xorReserve, impactBps) {
  if (input <= 0n || daiReserve <= 0n || xorReserve <= 0n || impactBps <= 0n || impactBps >= 10000n)
    throw new Error('Invalid sizing input');
  const requiredDai = (input * (10000n - impactBps) + impactBps - 1n) / impactBps;
  const addDai = requiredDai > daiReserve ? requiredDai - daiReserve : 0n;
  const addXor = (addDai * xorReserve + daiReserve - 1n) / daiReserve;
  const modeled = outputFeeQuote(input, daiReserve + addDai, xorReserve + addXor);
  return { requiredDai, addDai, addXor, spotMarkedDaiCapital: 2n * addDai, xorOutput: modeled.amount };
}

/** Read one finalized snapshot and refuse extrapolation when the live route is not the verified pool model. */
export async function collectNativeXorSizing() {
  const { ApiPromise, HttpProvider } = await import('@polkadot/api');
  const api = await ApiPromise.create({
    provider: new HttpProvider(ENDPOINT),
    noInitWarn: true,
    types: {
      AssetId: '[u8;32]',
      Balance: 'u128',
      ChargeFeeInfo: { tip: 'Compact<Balance>', target_asset_id: 'AssetId' },
    },
    signedExtensions: { ChargeTransactionPayment2: { extrinsic: { charge_fee_info: 'ChargeFeeInfo' }, payload: {} } },
  });
  let id = 0;
  /** Only the public quote/source RPCs are permitted through this bounded helper. */
  async function rpc(method, params) {
    if (!['liquidityProxy_quote', 'liquidityProxy_listEnabledSourcesForPath'].includes(method))
      throw new Error('Read method not allowed');
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    const body = await response.json();
    if (!response.ok || body.error || body.id !== id) throw new Error(`Read failed: ${method}`);
    return body.result;
  }
  try {
    if (api.genesisHash.toHex().toLowerCase() !== GENESIS) throw new Error('Wrong mainnet');
    const hash = await api.rpc.chain.getFinalizedHead();
    const at = await api.at(hash);
    const [header, reserves, properties, xorInfo, daiInfo, denominator, orderBook] = await Promise.all([
      api.rpc.chain.getHeader(hash),
      at.query.poolXYK.reserves(XOR, DAI),
      at.query.poolXYK.properties(XOR, DAI),
      at.query.assets.assetInfosV2({ code: XOR }),
      at.query.assets.assetInfosV2({ code: DAI }),
      at.query.denomination.denominator(),
      at.query.orderBook.orderBooks({ dexId: 0, base: DAI, quote: XOR }),
    ]);
    if (xorInfo.precision.toString() !== '18' || daiInfo.precision.toString() !== '18')
      throw new Error('Native precision changed');
    const xorReserve = positiveCodec(reserves[0].toString());
    const daiReserve = positiveCodec(reserves[1].toString());
    const result = {
      observedAt: new Date().toISOString(),
      endpoint: ENDPOINT,
      genesis: GENESIS,
      finalizedBlock: header.number.toString(),
      at: hash.toHex(),
      runtimeVersion: at.runtimeVersion.toJSON(),
      nativePrecision: 18,
      denominatorCodec: denominator.toString(),
      note: 'Native amounts only. USD scenarios assume 1 DAI = 1 USD and refer to net pool input, not an executable card quote. No funds or transactions.',
      pool: {
        assets: [XOR, DAI],
        accounts: properties.toJSON(),
        xorReserve: nativeAmount(xorReserve),
        daiReserve: nativeAmount(daiReserve),
        xorReserveCodec: xorReserve.toString(),
        daiReserveCodec: daiReserve.toString(),
        spotDaiPerXorTruncated: nativeAmount((daiReserve * UNIT) / xorReserve),
        directOrderBook: orderBook.toJSON(),
      },
      enabledSources: await rpc('liquidityProxy_listEnabledSourcesForPath', [0, DAI, XOR, hash.toHex()]),
      quotes: [],
      modelVerified: false,
      sizing: [],
    };
    for (const inputDai of ['5', '25', '100', '500']) {
      const input = BigInt(inputDai) * UNIT;
      const quoteArgs = [0, DAI, XOR, input.toString(), 'WithDesiredInput'];
      const xyk = await rpc('liquidityProxy_quote', [...quoteArgs, ['XYKPool'], 'AllowSelected', hash.toHex()]);
      const checkout = await rpc('liquidityProxy_quote', [
        ...quoteArgs,
        ['XYKPool', 'OrderBook'],
        'AllowSelected',
        hash.toHex(),
      ]);
      assertModelMatches(xyk, input, daiReserve, xorReserve);
      assertModelMatches(checkout, input, daiReserve, xorReserve);
      const amount = positiveCodec(checkout.amount);
      const withoutImpact = positiveCodec(checkout.amount_without_impact);
      result.quotes.push({
        inputDai,
        xyk,
        checkout,
        outputXor: nativeAmount(amount),
        impactPercentTruncated: nativeAmount(((withoutImpact - amount) * 100n * UNIT) / withoutImpact),
      });
    }
    result.modelVerified = true;
    for (const inputDai of ['100', '500']) {
      for (const targetBps of [500n, 300n]) {
        const sized = balancedDeposit(BigInt(inputDai) * UNIT, daiReserve, xorReserve, targetBps);
        result.sizing.push({
          netInputDai: inputDai,
          targetImpactBps: targetBps.toString(),
          ...Object.fromEntries(Object.entries(sized).map(([key, value]) => [key, nativeAmount(value)])),
          inventoryAtSpotXor: nativeAmount((BigInt(inputDai) * UNIT * xorReserve + daiReserve - 1n) / daiReserve),
          inventoryTenOrdersAtSpotXor: nativeAmount(
            (BigInt(inputDai) * UNIT * 10n * xorReserve + daiReserve - 1n) / daiReserve
          ),
        });
      }
    }
    return result;
  } finally {
    await api.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const timeout = setTimeout(() => {
    console.error('Read-only sizing timed out');
    process.exit(1);
  }, 120000);
  try {
    if (process.argv.length > 3) throw new Error('Usage: node scripts/liquidity/native-xor-sizing.mjs [output.json]');
    const output = process.argv[2] ?? 'output/tonswap-growth/native-xor-liquidity-sizing-2026-09-25.json';
    const result = await collectNativeXorSizing();
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
    console.log(
      JSON.stringify(
        { output, block: result.finalizedBlock, modelVerified: result.modelVerified, sizing: result.sizing },
        null,
        2
      )
    );
  } finally {
    clearTimeout(timeout);
  }
}
