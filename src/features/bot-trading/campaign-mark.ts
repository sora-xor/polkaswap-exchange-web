/** Chain-backed finalized valuations kept separate from pure campaign ledger accounting. */
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { api as walletApi } from '@/lib/soraneo-wallet/src/api';
import { codec } from './amounts';
import type { DiscoveryCampaignMark } from './campaign';
import type { BotDefinition } from './types';

const MARK_MAX_AGE_MS = 60_000;
const HASH = /^0x[0-9a-f]{64}$/i;

/** Read all campaign values and opening capital from one canonical finalized chain state. */
export async function readFinalizedDiscoveryCampaignMark(
  bots: readonly BotDefinition[],
  now = Date.now(),
  includeCapital = true
): Promise<DiscoveryCampaignMark> {
  if (!bots.length || bots.length > 3) throw new Error('bots.errors.policy');
  const connection = walletApi.connection;
  const chain = connection?.api;
  if (!chain?.isConnected) throw new Error('bots.errors.stale');
  await chain.isReady;
  const network = chain.genesisHash.toHex();
  if (bots.some((bot) => bot.network !== network)) throw new Error('bots.errors.network');
  const head = await chain.rpc.chain.getFinalizedHead();
  const [header, state] = await Promise.all([chain.rpc.chain.getHeader(head), chain.at(head)]);
  const blockHash = head.toHex();
  const blockNumber = header.number.toNumber();
  const timestampMs = Number((await state.query.timestamp.now()).toString());
  const denominator = (await state.query.denomination.denominator()).toString();
  if (
    !HASH.test(blockHash) || !Number.isSafeInteger(blockNumber) || blockNumber < 1 ||
    !Number.isSafeInteger(timestampMs) || timestampMs > now + 30_000 || now - timestampMs > MARK_MAX_AGE_MS ||
    !/^[1-9]\d{0,119}$/.test(denominator)
  ) throw new Error('bots.errors.stale');
  const check = async () => {
    if (
      walletApi.connection !== connection || connection.api !== chain || !chain.isConnected ||
      chain.genesisHash.toHex() !== network ||
      (await chain.rpc.chain.getBlockHash(blockNumber)).toHex() !== blockHash
    ) throw new Error('bots.errors.stale');
  };
  const quote = async (assetIn: string, assetOut: string, amountCodec: string, side: 'WithDesiredInput' | 'WithDesiredOutput') => {
    const amount = codec(amountCodec);
    if (!amount) return 0n;
    if (assetIn === assetOut) return amount;
    const dexIds = [...new Set([0, ...(walletApi.dex?.publicDexes ?? []).map((dex) => Number(dex.dexId))])]
      .filter((id) => Number.isSafeInteger(id) && id >= 0);
    const results = await Promise.allSettled(dexIds.map((dexId) =>
      chain.rpc.liquidityProxy.quote(dexId, assetIn, assetOut, amountCodec, side, [], 'Disabled', head)
    ));
    await check();
    const amounts = results.flatMap((result) => {
      if (result.status !== 'fulfilled' || result.value.isNone) return [];
      const value = result.value.unwrap();
      if (
        value.route[0]?.toString() !== assetIn ||
        value.route[value.route.length - 1]?.toString() !== assetOut
      ) return [];
      const quoted = codec(value.amount.toString());
      return quoted > 0n ? [quoted] : [];
    });
    if (!amounts.length) throw new Error('bots.errors.quote');
    // Liquidation uses the best available output; capital uses the most conservative required XOR input.
    return side === 'WithDesiredInput'
      ? amounts.reduce((best, value) => value > best ? value : best)
      : amounts.reduce((worst, value) => value > worst ? value : worst);
  };
  const valueIn = async (holdings: Record<string, string>, target: string) => {
    let value = 0n;
    for (const [asset, amount] of Object.entries(holdings))
      value += await quote(asset, target, amount, 'WithDesiredInput');
    return value.toString();
  };
  const values: DiscoveryCampaignMark['values'] = {};
  for (const bot of bots) {
    const currentOutputCodec = await valueIn(bot.portfolio.holdings, bot.assetOut.address);
    const holdOutputCodec = await valueIn(bot.portfolio.initial, bot.assetOut.address);
    let capitalXor = 0n;
    if (includeCapital) for (const [asset, amount] of Object.entries(bot.portfolio.initial))
      capitalXor += await quote(XOR.address, asset, amount, 'WithDesiredOutput');
    values[bot.id] = { currentOutputCodec, holdOutputCodec, capitalXorCodec: capitalXor.toString() };
  }
  await check();
  return { network, blockHash, blockNumber, timestampMs, denominator, values };
}
