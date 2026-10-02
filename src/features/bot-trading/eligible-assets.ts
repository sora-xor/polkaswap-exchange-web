import { api } from '@/lib/soraneo-wallet/src/api';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from './amounts';
import { waitForHistoryConnection } from './playground-history';
import type { BotAsset } from './types';

const FINALIZED_ASSET_READ_TIMEOUT_MS = 15_000;

/** Public current-state pool evidence; reserve amounts are native codec units, never USD estimates. */
export interface BotPoolReserve {
  address: string;
  xorCodec: string;
  targetCodec: string;
}

/** Select every valid whitelist token backed by more than one current XOR in its XOR pool. */
export function selectLiquidBotAssets(catalog: unknown, pools: BotPoolReserve[]): BotAsset[] {
  if (!Array.isArray(catalog) || catalog.length > 10000) throw new Error('bots.errors.config');
  const minimum = BigInt(toCodec('1', XOR.decimals));
  const eligible = new Set(
    pools
      .filter(
        (pool) =>
          /^(?:0|[1-9]\d{0,38})$/.test(pool.xorCodec) &&
          /^(?:0|[1-9]\d{0,38})$/.test(pool.targetCodec) &&
          BigInt(pool.xorCodec) > minimum &&
          BigInt(pool.targetCodec) > 0n
      )
      .map((pool) => pool.address)
  );
  const assets = new Map<string, BotAsset>();
  for (const item of catalog) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.address !== 'string' ||
      !/^0x[0-9a-f]{64}$/.test(item.address) ||
      typeof item.symbol !== 'string' ||
      !item.symbol ||
      item.symbol.length > 20 ||
      !Number.isInteger(item.decimals) ||
      item.decimals < 0 ||
      item.decimals > 36 ||
      !eligible.has(item.address)
    )
      continue;
    assets.set(item.address, { address: item.address, symbol: item.symbol, decimals: item.decimals });
  }
  if (assets.size) assets.set(XOR.address, { address: XOR.address, symbol: XOR.symbol, decimals: XOR.decimals });
  return [...assets.values()].sort((a, b) =>
    a.address === XOR.address ? -1 : b.address === XOR.address ? 1 : a.symbol.localeCompare(b.symbol)
  );
}

/**
 * Bind the complete IPFS-relative whitelist and pool reserves to one finalized connected chain identity.
 * Bound finalized RPC reads so a stalled node cannot prevent initialization and its retry timer.
 */
export async function fetchLiquidBotAssets(): Promise<BotAsset[]> {
  const { connection, chain, endpoint, genesis } = await waitForHistoryConnection();
  let expired = false;
  const assertCurrent = () => {
    if (
      expired ||
      api.connection !== connection ||
      connection.api !== chain ||
      connection.endpoint !== endpoint ||
      !chain.isConnected ||
      chain.genesisHash.toString() !== genesis
    )
      throw new Error('bots.errors.stale');
  };
  const response = await fetch('./whitelist.json', { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('bots.errors.config');
  const catalog: unknown = await response.json();
  assertCurrent();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const finalized = await chain.rpc.chain.getFinalizedHead();
        assertCurrent();
        const state = await chain.at(finalized);
        assertCurrent();
        const [coefficient, entries] = await Promise.all([
          state.query.denomination.denominator(),
          state.query.poolXYK.reserves.entries(XOR.address),
        ]);
        assertCurrent();
        if (!/^[1-9]\d{0,119}$/.test(coefficient.toString())) throw new Error('bots.errors.denomination');
        // These balances already use this finalized state's current denomination; dividing again would be wrong.
        return selectLiquidBotAssets(
          catalog,
          entries.map(([key, reserves]) => ({
            address: key.args[1].code.toString(),
            xorCodec: reserves[0].toString(),
            targetCodec: reserves[1].toString(),
          }))
        );
      })(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error('bots.errors.stale'));
        }, FINALIZED_ASSET_READ_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
