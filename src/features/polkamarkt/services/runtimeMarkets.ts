import { ApiPromise, WsProvider } from '@polkadot/api';

import type { PolkamarktMarket } from '../types';
import type { ApiPromise as ApiPromiseInstance } from '@polkadot/api';

type CodecLike = {
  isSome?: boolean;
  unwrap?: () => unknown;
  toHuman?: () => unknown;
  toJSON?: () => unknown;
  toString?: () => string;
};

type StorageKeyLike = {
  args?: unknown[];
};

type StorageQueryWithEntries = {
  entries: () => Promise<Array<[StorageKeyLike, unknown]>>;
};

type StorageQueryWithArgs = (...params: unknown[]) => Promise<unknown>;

type PolkamarktStorageApi = {
  markets?: StorageQueryWithEntries;
  conditions?: StorageQueryWithArgs;
  conditionDetails?: StorageQueryWithArgs;
  marketDpmCollateral?: StorageQueryWithArgs;
  marketVolume?: StorageQueryWithArgs;
  marketPositionTotals?: StorageQueryWithArgs;
  marketCreatorFees?: StorageQueryWithArgs;
  earlyResolutionReports?: StorageQueryWithArgs;
  early_resolution_reports?: StorageQueryWithArgs;
};

type PolkamarktRpcApi = {
  marketState?: (...params: unknown[]) => Promise<unknown>;
};

const READ_ONLY_RUNTIME_TIMEOUT_MS = 15_000;
const POLKAMARKT_COLLATERAL_DECIMALS = 18;
const POLKAMARKT_DEFAULT_ORACLE = 'SORA On-Chain Governance';
const MARKET_CATEGORIES: ReadonlyArray<PolkamarktMarket['category']> = [
  'Politics',
  'Geopolitics',
  'Elections',
  'Crypto',
  'Macro',
  'Finance',
  'Sports',
  'Technology',
  'AI',
  'Science',
  'Climate',
  'Health',
  'Business',
  'Entertainment',
  'Culture',
  'Legal',
  'Other',
];
const MARKET_CATEGORY_ALIASES: Record<string, PolkamarktMarket['category']> = {
  ecosystem: 'Crypto',
  governance: 'Politics',
  grants: 'Business',
  infrastructure: 'Technology',
  liquidity: 'Crypto',
  markets: 'Finance',
  operations: 'Business',
  partnerships: 'Business',
  protocol: 'Crypto',
  research: 'Science',
  security: 'Technology',
  tokenomics: 'Crypto',
  treasury: 'Finance',
};
const GOVERNANCE_ORACLE_ALIASES = new Set([
  'sora council',
  'sora technical committee',
  'sora council and technical committee',
  'sora governance',
  'sora on-chain governance',
]);

const parseString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const parseRuntimeNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value).replace(/,/g, ''), 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
};

const normalizeRuntimeMarketCategory = (value: string): PolkamarktMarket['category'] | undefined => {
  const trimmed = value.trim();
  if ((MARKET_CATEGORIES as readonly string[]).includes(trimmed)) return trimmed as PolkamarktMarket['category'];
  return MARKET_CATEGORY_ALIASES[trimmed.toLowerCase()];
};

const normalizeRuntimeMarketOracle = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
  return GOVERNANCE_ORACLE_ALIASES.has(normalized) ? POLKAMARKT_DEFAULT_ORACLE : trimmed;
};

const unwrapCodecOption = (value: unknown): unknown => {
  const codec = value as CodecLike | null | undefined;
  if (!codec) return null;

  if (typeof codec.isSome === 'boolean') {
    if (!codec.isSome) return null;
    return typeof codec.unwrap === 'function' ? codec.unwrap() : value;
  }

  return value;
};

const codecValue = (value: unknown, preferred: 'json' | 'human' = 'json'): unknown => {
  const unwrapped = unwrapCodecOption(value);
  if (unwrapped === null || unwrapped === undefined) return null;

  const codec = unwrapped as CodecLike;
  const primary = preferred === 'human' ? codec.toHuman : codec.toJSON;
  const secondary = preferred === 'human' ? codec.toJSON : codec.toHuman;

  if (typeof primary === 'function') return primary.call(unwrapped);
  if (typeof secondary === 'function') return secondary.call(unwrapped);

  return unwrapped;
};

const codecRecord = (value: unknown, preferred: 'json' | 'human' = 'json'): Record<string, unknown> => {
  const normalized = codecValue(value, preferred);
  return normalized && typeof normalized === 'object' && !Array.isArray(normalized)
    ? (normalized as Record<string, unknown>)
    : {};
};

const normalizedKey = (value: string): string => value.replace(/_/g, '').toLowerCase();

const recordValue = (record: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];

    const target = normalizedKey(key);
    const actualKey = Object.keys(record).find((candidate) => normalizedKey(candidate) === target);
    if (actualKey && record[actualKey] !== undefined && record[actualKey] !== null) return record[actualKey];
  }

  return undefined;
};

const codecBigInt = (value: unknown): bigint => {
  const normalized = unwrapCodecOption(value);

  if (typeof normalized === 'bigint') return normalized;
  if (typeof normalized === 'number') return BigInt(Math.trunc(normalized));

  if (typeof normalized === 'string') {
    const text = normalized.replace(/,/g, '').trim();
    if (!text) return 0n;
    if (/^0x[0-9a-fA-F]+$/.test(text) || /^\d+$/.test(text)) return BigInt(text);
  }

  if (normalized && typeof normalized === 'object' && 'toString' in normalized) {
    return codecBigInt((normalized as { toString(): string }).toString());
  }

  return 0n;
};

const codecAmountToNumber = (value: unknown): number => {
  const amount = codecBigInt(value);
  if (!amount) return 0;

  const decimals = POLKAMARKT_COLLATERAL_DECIMALS;
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = amount % scale;

  if (!fraction) return Number(whole);

  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return Number(`${whole.toString()}.${fractionText}`);
};

const bpsToPercent = (value: unknown): number | undefined => {
  const bps = parseRuntimeNumber(value);
  return bps === undefined ? undefined : Math.max(0, Math.min(100, bps / 100));
};

const decodeHexText = (value: string): string => {
  const normalized = value.trim();
  if (!/^0x[0-9a-fA-F]*$/.test(normalized) || normalized.length <= 2) return normalized;

  const bytes = new Uint8Array(
    normalized
      .slice(2)
      .match(/.{1,2}/g)
      ?.map((byte) => Number.parseInt(byte, 16)) ?? []
  );

  return new TextDecoder().decode(bytes).split(String.fromCharCode(0)).join('').trim();
};

const metadataText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const decoded = decodeHexText(value);
  return decoded && !decoded.includes('\uFFFD') ? decoded : undefined;
};

const bytesValueToArray = (value: unknown): number[] => {
  const normalized = unwrapCodecOption(value);
  if (Array.isArray(normalized)) {
    return normalized.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0 && item <= 255);
  }
  if (normalized instanceof Uint8Array) {
    return Array.from(normalized);
  }
  if (typeof normalized === 'string') {
    const text = normalized.trim();
    if (/^0x[0-9a-fA-F]*$/.test(text)) {
      return (
        text
          .slice(2)
          .match(/.{1,2}/g)
          ?.map((byte) => Number.parseInt(byte, 16)) ?? []
      );
    }
    return Array.from(new TextEncoder().encode(text));
  }
  if (normalized && typeof normalized === 'object' && 'toString' in normalized) {
    return bytesValueToArray(String(normalized));
  }
  return [];
};

const bytesValueToText = (value: unknown): string | undefined => {
  const bytes = bytesValueToArray(value);
  if (!bytes.length) return undefined;
  const decoded = new TextDecoder().decode(new Uint8Array(bytes)).trim();
  return decoded && !decoded.includes('\uFFFD') ? decoded : undefined;
};

const bytesValueToHex = (value: unknown): string | undefined => {
  const bytes = bytesValueToArray(value);
  return bytes.length ? `0x${bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')}` : undefined;
};

const runtimeOutcome = (value: unknown): 'YES' | 'NO' => (String(value ?? '').toLowerCase() === 'no' ? 'NO' : 'YES');

const parseEarlyResolutionReport = (
  value: unknown
): Pick<
  PolkamarktMarket,
  | 'earlyResolutionOutcome'
  | 'earlyResolutionReporter'
  | 'earlyResolutionBond'
  | 'earlyResolutionEvidenceUri'
  | 'earlyResolutionEvidenceHash'
  | 'earlyResolutionEvidenceBlock'
> | null => {
  const record = codecRecord(value);
  if (!Object.keys(record).length) return null;

  const evidenceValue = recordValue(record, 'evidence');
  const evidence =
    evidenceValue && typeof evidenceValue === 'object' && !Array.isArray(evidenceValue)
      ? (evidenceValue as Record<string, unknown>)
      : {};

  return {
    earlyResolutionOutcome: runtimeOutcome(recordValue(record, 'outcome')),
    earlyResolutionReporter: parseString(String(recordValue(record, 'reporter') ?? '')),
    earlyResolutionBond: codecAmountToNumber(recordValue(record, 'bond')),
    earlyResolutionEvidenceUri: bytesValueToText(recordValue(evidence, 'uri')),
    earlyResolutionEvidenceHash: bytesValueToHex(recordValue(evidence, 'hash')),
    earlyResolutionEvidenceBlock: parseRuntimeNumber(recordValue(evidence, 'atBlock', 'at_block')),
  };
};

const parseCategory = (value: unknown): PolkamarktMarket['category'] => {
  const category = parseString(value);
  return category ? (normalizeRuntimeMarketCategory(category) ?? 'Other') : 'Other';
};

const marketDescription = (oracle?: string, resolutionSource?: string): string => {
  const sentences = [
    oracle ? `Resolved by ${oracle.replace(/[.\s]+$/, '')}` : undefined,
    resolutionSource ? `Resolution source: ${resolutionSource.replace(/[.\s]+$/, '')}` : undefined,
  ].filter((sentence): sentence is string => Boolean(sentence));

  return sentences.length ? `${sentences.join('. ')}.` : 'Read from live SORA market storage.';
};

const storageKeyNumber = (key: StorageKeyLike): number | undefined => parseRuntimeNumber(key.args?.[0]);

/**
 * Parses one runtime Polkamarkt storage entry into the same market model the indexer returns.
 */
export async function parseRuntimePolkamarktMarket(
  storage: PolkamarktStorageApi,
  marketId: number,
  value: unknown,
  rpc?: PolkamarktRpcApi
): Promise<PolkamarktMarket | null> {
  const market = codecRecord(value);
  const conditionId = parseRuntimeNumber(recordValue(market, 'conditionId', 'condition_id'));
  const conditionRecord =
    conditionId === undefined || !storage.conditions ? {} : codecRecord(await storage.conditions(conditionId), 'human');
  const detailsRecord =
    conditionId === undefined || !storage.conditionDetails
      ? {}
      : codecRecord(await storage.conditionDetails(conditionId), 'human');
  let stateRecord: Record<string, unknown> = {};
  if (rpc?.marketState) {
    try {
      stateRecord = codecRecord(await rpc.marketState(marketId));
    } catch {
      stateRecord = {};
    }
  }
  const totalsRecord = storage.marketPositionTotals ? codecRecord(await storage.marketPositionTotals(marketId)) : {};
  const volume = storage.marketVolume ? codecAmountToNumber(await storage.marketVolume(marketId)) : 0;
  const creatorFees = storage.marketCreatorFees
    ? codecAmountToNumber(await storage.marketCreatorFees(marketId))
    : undefined;
  const earlyReportQuery = storage.earlyResolutionReports ?? storage.early_resolution_reports;
  const earlyReport = earlyReportQuery ? parseEarlyResolutionReport(await earlyReportQuery(marketId)) : null;

  const title = metadataText(recordValue(conditionRecord, 'question'));
  if (!title) return null;

  const oracle = normalizeRuntimeMarketOracle(metadataText(recordValue(conditionRecord, 'oracle')));
  const resolutionSource = metadataText(recordValue(conditionRecord, 'resolutionSource', 'resolution_source'));
  const totalYesShares = codecAmountToNumber(recordValue(totalsRecord, 'totalYesShares', 'total_yes_shares'));
  const totalNoShares = codecAmountToNumber(recordValue(totalsRecord, 'totalNoShares', 'total_no_shares'));
  const realYesShares = codecAmountToNumber(recordValue(stateRecord, 'realYesShares', 'real_yes_shares'));
  const realNoShares = codecAmountToNumber(recordValue(stateRecord, 'realNoShares', 'real_no_shares'));
  const yesShares = realYesShares || totalYesShares;
  const noShares = realNoShares || totalNoShares;
  const dpmCollateral =
    codecAmountToNumber(recordValue(stateRecord, 'dpmCollateral', 'dpm_collateral')) ||
    (storage.marketDpmCollateral ? codecAmountToNumber(await storage.marketDpmCollateral(marketId)) : 0);
  const impliedYesProbability = bpsToPercent(recordValue(stateRecord, 'impliedYesProbabilityBps'));
  const impliedNoProbability = bpsToPercent(recordValue(stateRecord, 'impliedNoProbabilityBps'));
  const probability =
    impliedYesProbability ??
    (yesShares + noShares > 0
      ? Math.max(0, Math.min(100, Math.round((yesShares / (yesShares + noShares)) * 100)))
      : undefined);
  const mechanism = parseString(recordValue(stateRecord, 'mechanism')) ?? parseString(recordValue(market, 'mechanism'));

  return {
    id: String(marketId),
    chainId: marketId,
    conditionId,
    creator: parseString(recordValue(market, 'creator')),
    title,
    category: parseCategory(recordValue(detailsRecord, 'category')),
    description: marketDescription(oracle, resolutionSource),
    oracle,
    resolutionSource,
    closeBlock: parseRuntimeNumber(recordValue(market, 'closeBlock', 'close_block')),
    liquidity: dpmCollateral,
    volume,
    probability,
    trending: false,
    status: parseString(recordValue(market, 'status')),
    mechanism,
    virtualDepth: codecAmountToNumber(recordValue(stateRecord, 'virtualDepth', 'virtual_depth')) || undefined,
    dpmCollateral: dpmCollateral || undefined,
    realYesShares: realYesShares || undefined,
    realNoShares: realNoShares || undefined,
    marginalYesPriceBps: parseRuntimeNumber(recordValue(stateRecord, 'marginalYesPriceBps')) ?? undefined,
    marginalNoPriceBps: parseRuntimeNumber(recordValue(stateRecord, 'marginalNoPriceBps')) ?? undefined,
    impliedYesProbabilityBps:
      parseRuntimeNumber(recordValue(stateRecord, 'impliedYesProbabilityBps')) ??
      (impliedYesProbability === undefined ? undefined : Math.round(impliedYesProbability * 100)),
    impliedNoProbabilityBps:
      parseRuntimeNumber(recordValue(stateRecord, 'impliedNoProbabilityBps')) ??
      (impliedNoProbability === undefined ? undefined : Math.round(impliedNoProbability * 100)),
    creatorFees,
    ...(earlyReport ?? {}),
  };
}

/**
 * Reads Polkamarkt markets directly from the connected SORA runtime.
 */
export async function fetchRuntimePolkamarktMarkets(api?: ApiPromiseInstance | null): Promise<PolkamarktMarket[]> {
  const storage = api?.query?.polkamarkt as unknown as PolkamarktStorageApi | undefined;
  const rpc = api?.rpc?.polkamarkt as unknown as PolkamarktRpcApi | undefined;
  if (!storage?.markets?.entries) return [];

  const entries = await storage.markets.entries();
  const parsed = await Promise.all(
    entries.map(([key, value]) => {
      const marketId = storageKeyNumber(key);
      return marketId === undefined
        ? Promise.resolve(null)
        : parseRuntimePolkamarktMarket(storage, marketId, value, rpc);
    })
  );

  return parsed.filter((market): market is PolkamarktMarket => Boolean(market));
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Opens a short-lived read-only SORA connection so fresh markets are visible before the indexer catches up.
 */
export async function fetchReadOnlyRuntimePolkamarktMarkets(endpoint?: string): Promise<PolkamarktMarket[]> {
  if (!endpoint) return [];

  const provider = new WsProvider(endpoint);
  let api: ApiPromiseInstance | undefined;

  try {
    api = await withTimeout(
      ApiPromise.create({
        provider,
        noInitWarn: true,
      }),
      READ_ONLY_RUNTIME_TIMEOUT_MS,
      'Timed out loading runtime Polkamarkt markets.'
    );
    return await fetchRuntimePolkamarktMarkets(api);
  } finally {
    await api?.disconnect().catch(() => undefined);
    await provider.disconnect().catch(() => undefined);
  }
}

const marketRuntimeKey = (market: PolkamarktMarket): string | undefined =>
  market.chainId === undefined ? undefined : String(market.chainId);

const earlyReportPatch = (
  market: PolkamarktMarket
): Pick<
  PolkamarktMarket,
  | 'earlyResolutionOutcome'
  | 'earlyResolutionReporter'
  | 'earlyResolutionBond'
  | 'earlyResolutionEvidenceUri'
  | 'earlyResolutionEvidenceHash'
  | 'earlyResolutionEvidenceBlock'
  | 'status'
> => ({
  earlyResolutionOutcome: market.earlyResolutionOutcome,
  earlyResolutionReporter: market.earlyResolutionReporter,
  earlyResolutionBond: market.earlyResolutionBond,
  earlyResolutionEvidenceUri: market.earlyResolutionEvidenceUri,
  earlyResolutionEvidenceHash: market.earlyResolutionEvidenceHash,
  earlyResolutionEvidenceBlock: market.earlyResolutionEvidenceBlock,
  status: market.earlyResolutionOutcome ? market.status : undefined,
});

/**
 * Keeps indexed market data authoritative while appending markets that exist on-chain but are not indexed yet.
 */
export function mergePolkamarktMarkets(
  indexedMarkets: PolkamarktMarket[],
  runtimeMarkets: PolkamarktMarket[]
): PolkamarktMarket[] {
  if (!runtimeMarkets.length) return indexedMarkets;

  const runtimeById = new Map<string, PolkamarktMarket>();
  runtimeMarkets.forEach((market) => {
    const runtimeKey = marketRuntimeKey(market);
    if (runtimeKey) runtimeById.set(runtimeKey, market);
  });
  const enrichedIndexedMarkets = indexedMarkets.map((market) => {
    const runtimeMarket = runtimeById.get(marketRuntimeKey(market) ?? '');
    return runtimeMarket?.earlyResolutionOutcome ? { ...market, ...earlyReportPatch(runtimeMarket) } : market;
  });
  const indexedRuntimeIds = new Set(indexedMarkets.map(marketRuntimeKey).filter((id): id is string => Boolean(id)));
  const indexedIds = new Set(indexedMarkets.map((market) => market.id));
  const fallbackMarkets = runtimeMarkets.filter((market) => {
    const runtimeKey = marketRuntimeKey(market);
    return (runtimeKey === undefined || !indexedRuntimeIds.has(runtimeKey)) && !indexedIds.has(market.id);
  });

  return [...enrichedIndexedMarkets, ...fallbackMarkets].sort((left, right) => {
    if (left.volume !== right.volume) return right.volume - left.volume;
    return (right.chainId ?? -1) - (left.chainId ?? -1);
  });
}
