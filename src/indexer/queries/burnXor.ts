import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { hexToString, isHex, u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { api } from '@/lib/soraneo-wallet/src/api';
import { getCurrentIndexer, SubqueryIndexer, SubsquidIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { IndexerType } from '@/indexer/queries/indexerConsts';
import { gql } from '@urql/core';
import { parseSoraNexusXorBurnRemark } from '@/utils/soraNexusAccount';

import type {
  CallArgs,
  ConnectionQueryResponse,
  HistoryElement,
  HistoryElementAssetBurn,
  HistoryElementBatchCall,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

export type XorBurn = {
  address: string;
  amount: FPNumber;
  blockHeight: number;
  nexusRecipient?: string;
  txHash?: string;
};

type ApiEventRecord = {
  phase?: {
    isApplyExtrinsic?: boolean;
    asApplyExtrinsic?: { toNumber?: () => number; toString: () => string } | number;
  };
  event: {
    section: string;
    method: string;
    data: Array<{ toString: () => string; toJSON?: () => unknown; code?: { toString: () => string } }>;
  };
};

type SignedBlock = {
  block?: {
    extrinsics?: Array<{
      hash?: { toString: () => string };
      method?: SignedExtrinsicMethod;
    }>;
  };
};

type SignedExtrinsicMethod = {
  args?: unknown[];
  method?: string;
  section?: string;
};

type SignedExtrinsicCall = {
  args?: unknown[];
  method?: string;
  section?: string;
};

type BurnData = {
  data: HistoryElementAssetBurn;
  isCodecAmount: boolean;
};

type AssetIdLike = {
  toString?: () => string;
  toJSON?: () => unknown;
  code?: { toString: () => string };
};

type OnChainBurnEventData = {
  address: string;
  amount: string;
  extrinsicIndex: Nullable<number>;
};

type AccountOnChainBurnCache = {
  start: number;
  end: number;
  burns: XorBurn[];
  promise: Nullable<Promise<void>>;
};

type SoraMetricsExtrinsic = {
  block?: number | string;
  extrinsic_index?: number | string;
  hash?: string;
  signer?: string;
  success?: number | boolean;
};

type SoraMetricsExtrinsicsResponse = {
  data?: SoraMetricsExtrinsic[];
};

type ChainApiShape = {
  isConnected?: boolean;
  rpc?: {
    chain?: {
      getBlock?: unknown;
      getBlockHash?: unknown;
    };
  };
  query?: {
    system?: {
      events?: {
        at?: unknown;
      };
    };
  };
};

const SORA_XOR_BURN_START_BLOCK = 25_043_003;
const SORA_METRICS_BASE_URL = 'https://sorametrics.org';
const SORA_METRICS_PAGE_LIMIT = 100;
const SORA_METRICS_PAGE_COUNT = 3;
const SORA_METRICS_CACHE_TTL_MS = 30_000;
const SORA_METRICS_RPC_CONCURRENCY = 12;
const ON_CHAIN_SCAN_CHUNK_SIZE = 250;
const ON_CHAIN_SCAN_SYNC_BLOCK_LIMIT = ON_CHAIN_SCAN_CHUNK_SIZE;
const ACCOUNT_ON_CHAIN_SCAN_SYNC_BLOCK_LIMIT = 1_000;
const MIN_NORMALIZABLE_ADDRESS_LENGTH = 32;
const EXCLUDED_XOR_BURN_ADDRESSES = ['cnRus2m2Rn776v88H5RUtyiaXtr3daN6ePn6yenLKepx1SqYo'];

const onChainBurnCache = {
  start: 0,
  end: 0,
  burns: [] as XorBurn[],
};
const accountOnChainBurnCaches: Record<string, AccountOnChainBurnCache> = {};
const soraMetricsExtrinsicsCache: Record<string, { expiresAt: number; promise: Promise<SoraMetricsExtrinsic[]> }> = {};

let onChainScanPromise: Nullable<Promise<void>> = null;

/**
 * Clears in-memory burn caches so isolated callers can force fresh indexer and RPC reads.
 */
export function clearBurnXorQueryCaches(): void {
  onChainBurnCache.start = 0;
  onChainBurnCache.end = 0;
  onChainBurnCache.burns = [];
  onChainScanPromise = null;

  for (const key of Object.keys(accountOnChainBurnCaches)) {
    delete accountOnChainBurnCaches[key];
  }

  for (const key of Object.keys(soraMetricsExtrinsicsCache)) {
    delete soraMetricsExtrinsicsCache[key];
  }
}

const dataBeforeSubqueryIndexing: XorBurn[] = [
  // https://sora.subscan.io/extrinsic/0xa072a5c6c0d847cef807e57c303fd60fdde67d8e10b1c080de428ba15b78bdb6
  {
    address: 'cnV21a8zn14wUTuxUK6wy5Fmus8PXaGrsBUchz33MqavYqxHE',
    amount: FPNumber.fromCodecValue('2000000000000000000000000'),
    blockHeight: 14496081,
    txHash: '0xa072a5c6c0d847cef807e57c303fd60fdde67d8e10b1c080de428ba15b78bdb6',
  },
  // https://sora.subscan.io/extrinsic/0x2727e182d531ad890f9937beded0527d4a6d68018977b484658391fdd1e80880
  {
    address: 'cnXES5tPEMkhLmhG57v55aYW4x1DtqHFM9Ft8rBcLNyHHFVSm',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
    blockHeight: 14488966,
    txHash: '0x2727e182d531ad890f9937beded0527d4a6d68018977b484658391fdd1e80880',
  },
  // https://sora.subscan.io/extrinsic/0xb90cb95d71bc43d7c4212b1aa7b97b199436e706cd6ff1a73a9cd81ed8842df9
  {
    address: 'cnTkiF9YpNT8uzwQvJFJHf7Vr3KtFppF2VGxE22C1MTMbHEmN',
    amount: FPNumber.fromCodecValue('25000000000000000000000000'),
    blockHeight: 14482098,
    txHash: '0xb90cb95d71bc43d7c4212b1aa7b97b199436e706cd6ff1a73a9cd81ed8842df9',
  },
  // https://sora.subscan.io/extrinsic/0x2db91f8192e84d38956f4335acc3e98a6085be5d3d1ec645e3588854ac6970a0
  {
    address: 'cnRdTJwjwpn67KgnWGcbBJpMipryNNos15NEFWV4sEfSnNnM6',
    amount: FPNumber.fromCodecValue('4000000000000000000000000'),
    blockHeight: 14473177,
    txHash: '0x2db91f8192e84d38956f4335acc3e98a6085be5d3d1ec645e3588854ac6970a0',
  },
  // https://sora.subscan.io/extrinsic/0x6290185892566e17fdc70e29ac0227819d67e9ac85da6981c2036724ffa15dcd
  {
    address: 'cnW4cSTA6CB3zDw2kLknDwZRqPPwPDdFURN2nhHVg8C2SnrNX',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
    blockHeight: 14471099,
    txHash: '0x6290185892566e17fdc70e29ac0227819d67e9ac85da6981c2036724ffa15dcd',
  },
  // https://sora.subscan.io/extrinsic/0x580f85275b21e43a2923d4a0e3af9d92832bb8f63c2a9f0b2fa17dd9e97d1533
  {
    address: 'cnTmBrrR4CFs3GDA1DjWhAMsXXAJQJwUCkFtbsRsXhXJWTB3J',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
    blockHeight: 14467209,
    txHash: '0x580f85275b21e43a2923d4a0e3af9d92832bb8f63c2a9f0b2fa17dd9e97d1533',
  },
  // https://sora.subscan.io/extrinsic/0x733da9635badd2692ff9c76b4ad761e7460fd88b72f04edb5f7e844dc6ce188e
  {
    address: 'cnTYLL7UNk9tak7gRZnZXxfor5UvMSEebBUsSLwwhyZvDdKWB',
    amount: FPNumber.fromCodecValue('1500000000000000000000000'),
    blockHeight: 14467173,
    txHash: '0x733da9635badd2692ff9c76b4ad761e7460fd88b72f04edb5f7e844dc6ce188e',
  },
  // https://sora.subscan.io/extrinsic/0xc51f24899e5d89765647bef5663a58db873bffbd4af26b9a6e39787e762bbeb7
  {
    address: 'cnVA8S2CNn2h4CjW2vTnqnSRqEL4P2ShvPWYA46TYEdTtao3S',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
    blockHeight: 14467085,
    txHash: '0xc51f24899e5d89765647bef5663a58db873bffbd4af26b9a6e39787e762bbeb7',
  },
  // https://sora.subscan.io/extrinsic/0xa0fd341cbdb2c6de2873dd3edb2e59a5fbb3e6cdcd056a2f4f8f3ba4663cf68f
  {
    address: 'cnTdA96vs4okPqpfSaPwSCPunkEn6AYTLek6rBvP9LbXbinAh',
    amount: FPNumber.fromCodecValue('10000000000000000000000000'),
    blockHeight: 14466510,
    txHash: '0xa0fd341cbdb2c6de2873dd3edb2e59a5fbb3e6cdcd056a2f4f8f3ba4663cf68f',
  },
  // https://sora.subscan.io/extrinsic/0xf1caed8923c9412f682a0181073358c1d0559219831693d9bf37ef6c77f33b6c
  {
    address: 'cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB',
    amount: FPNumber.fromCodecValue('1500000000000000000000000'),
    blockHeight: 14465935,
    txHash: '0xf1caed8923c9412f682a0181073358c1d0559219831693d9bf37ef6c77f33b6c',
  },
  // https://sora.subscan.io/extrinsic/0xc3319a9bfd7ea92d19b2910d16df189f8cbd81aa7809e8febc2c10a376996ec9
  {
    address: 'cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB',
    amount: FPNumber.fromCodecValue('10000000000000000000000000'),
    blockHeight: 14464669,
    txHash: '0xc3319a9bfd7ea92d19b2910d16df189f8cbd81aa7809e8febc2c10a376996ec9',
  },
  // https://sora.subscan.io/extrinsic/0x626147716deb3059bfb4d0f3f564cb8d336e7d99dbf1d6a99125d852cb449046
  {
    address: 'cnTkiF9YpNT8uzwQvJFJHf7Vr3KtFppF2VGxE22C1MTMbHEmN',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
    blockHeight: 14464111,
    txHash: '0x626147716deb3059bfb4d0f3f564cb8d336e7d99dbf1d6a99125d852cb449046',
  },
];

const getSubqueryXorBurnQuery = (address?: string) => gql<ConnectionQueryResponse<HistoryElement>>`
  query XorBurnQuery($start: Int = 0, $end: Int = 0, $after: Cursor = "", $first: Int = 100) {
    data: historyElements(
      first: $first
      after: $after
      filter: {
        and: [
          { blockHeight: { greaterThanOrEqualTo: $start } }
          { blockHeight: { lessThanOrEqualTo: $end } }
          ${address ? `{ address: { equalTo: "${address}" } }` : ''}
          {
            or: [
              {
                and: [
                  { module: { equalTo: "assets" } }
                  { method: { equalTo: "burn" } }
                  { data: { contains: { assetId: "${XOR.address}" } } }
                ]
              }
              {
                and: [
                  { module: { equalTo: "utility" } }
                  { method: { equalTo: "batchAll" } }
                  { callNames: { contains: ["assets.burn"] } }
                ]
              }
              {
                and: [
                  { module: { equalTo: "utility" } }
                  { method: { equalTo: "batch" } }
                  { callNames: { contains: ["assets.burn"] } }
                ]
              }
            ]
          }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          address
          data
          blockHeight
          module
          method
          calls {
            nodes {
              module
              method
              data
            }
          }
        }
      }
    }
  }
`;

const getSubsquidXorBurnQuery = (address?: string) => gql<ConnectionQueryResponse<HistoryElement>>`
  query XorBurnQuery($start: Int = 0, $end: Int = 0, $after: String = null, $first: Int = 100) {
    data: historyElementsConnection(
      orderBy: id_ASC
      first: $first
      after: $after
      where: {
        AND: [
          { blockHeight_gte: $start }
          { blockHeight_lte: $end }
          ${address ? `{ address_eq: "${address}" }` : ''}
          {
            OR: [
              {
                AND: [
                  { module_eq: "assets" }
                  { method_eq: "burn" }
                  { data_jsonContains: { assetId: "${XOR.address}" } }
                ]
              }
              {
                AND: [
                  { module_eq: "utility" }
                  { method_eq: "batchAll" }
                  { callNames_containsAny: ["assets.burn"] }
                ]
              }
              {
                AND: [
                  { module_eq: "utility" }
                  { method_eq: "batch" }
                  { callNames_containsAny: ["assets.burn"] }
                ]
              }
            ]
          }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          address
          data
          blockHeight
          module
          method
          calls {
            module
            method
            data
          }
        }
      }
    }
  }
`;

const getCalls = (item: HistoryElement): HistoryElementBatchCall[] => {
  const calls = item.calls as HistoryElement['calls'] | { nodes?: HistoryElementBatchCall[] } | undefined;

  if (Array.isArray(calls)) return calls;
  return calls?.nodes ?? [];
};

const getCallDataArgs = (data: HistoryElementBatchCall['data']): CallArgs => {
  if (data && typeof data === 'object' && 'args' in data) {
    return data.args as CallArgs;
  }

  return data as CallArgs;
};

const getBurnData = (item: HistoryElement): Nullable<BurnData> => {
  if (item.module === 'assets' && item.method === 'burn') {
    return { data: item.data as HistoryElementAssetBurn, isCodecAmount: false };
  }

  const burnCall = getCalls(item).find((call) => call.module === 'assets' && call.method === 'burn');
  return burnCall ? { data: getCallDataArgs(burnCall.data) as HistoryElementAssetBurn, isCodecAmount: true } : null;
};

const getAssetIdString = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;

  const assetId = value as AssetIdLike;
  const code = assetId.code?.toString();

  if (code) return code;

  const json = assetId.toJSON?.();

  if (typeof json === 'string') return json;
  if (json && typeof json === 'object' && 'code' in json) return String((json as { code?: unknown }).code ?? '');

  const stringValue = assetId.toString?.() ?? '';

  try {
    const parsed = JSON.parse(stringValue) as { code?: unknown };
    if (parsed?.code) return String(parsed.code);
  } catch {
    // Non-JSON codec strings are already the canonical asset id.
  }

  return stringValue;
};

const getCallArgString = (args: CallArgs, key: string): string => {
  const value = args[key];
  const rawValue = Array.isArray(value) ? value[0] : value;

  return rawValue === undefined || rawValue === null ? '' : String(rawValue);
};

const decodeRemarkText = (value: unknown): string => {
  const rawValue = typeof value === 'string' ? value : (value as { toString?: () => string } | undefined)?.toString?.() ?? '';

  if (!rawValue) return '';

  try {
    return isHex(rawValue) ? hexToString(rawValue) : rawValue;
  } catch {
    return rawValue;
  }
};

const getBurnAssetId = (data: HistoryElementAssetBurn): string => {
  return getAssetIdString(data.assetId ?? (data as HistoryElementAssetBurn & { asset_id?: string })?.asset_id);
};

const isXorBurnCall = (call: Nullable<HistoryElementBatchCall>): boolean => {
  if (!call || call.module !== 'assets' || call.method !== 'burn') return false;

  const data = getCallDataArgs(call.data) as HistoryElementAssetBurn;
  return getBurnAssetId(data) === XOR.address;
};

const getBatchAllNexusRecipient = (item: HistoryElement): string | undefined => {
  if (item.module !== 'utility' || item.method !== 'batchAll') return undefined;

  const calls = getCalls(item);
  const [burnCall, remarkCall] = calls;

  if (calls.length !== 2 || !isXorBurnCall(burnCall) || remarkCall?.module !== 'system' || remarkCall.method !== 'remark') {
    return undefined;
  }

  const remarkArgs = getCallDataArgs(remarkCall.data);
  const remark = parseSoraNexusXorBurnRemark(decodeRemarkText(getCallArgString(remarkArgs, 'remark')));

  return remark?.recipient;
};

const parse = (item: HistoryElement): Nullable<XorBurn> => {
  const burn = getBurnData(item);
  const data = burn?.data;
  const assetId = data ? getBurnAssetId(data) : '';

  if (!data?.amount || assetId !== XOR.address) return null;

  return {
    address: item.address,
    amount: burn.isCodecAmount ? FPNumber.fromCodecValue(data.amount, XOR.decimals) : new FPNumber(data.amount),
    blockHeight: +item.blockHeight,
    nexusRecipient: getBatchAllNexusRecipient(item),
    txHash: item.id,
  };
};

const getChainApi = () => {
  try {
    return api.connection?.api ?? null;
  } catch {
    return null;
  }
};

const isChainApiReady = (chainApi: NonNullable<ReturnType<typeof getChainApi>>): boolean => {
  const candidate = chainApi as ChainApiShape;

  return (
    candidate.isConnected !== false &&
    typeof candidate.rpc?.chain?.getBlockHash === 'function' &&
    typeof candidate.rpc?.chain?.getBlock === 'function' &&
    typeof candidate.query?.system?.events?.at === 'function'
  );
};

const getBlockRange = (start: number, end: number): number[] => {
  if (end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const getReverseBlockRange = (start: number, end: number): number[] => {
  if (end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => end - index);
};

const normalizeAddress = (address: string): string => {
  if (address.length < MIN_NORMALIZABLE_ADDRESS_LENGTH) return address;

  try {
    const decoded = decodeAddress(address);
    return decoded.length === 32 ? u8aToHex(decoded) : address;
  } catch {
    return address;
  }
};

const isSameAddress = (left: string, right: string): boolean => {
  return left === right || normalizeAddress(left) === normalizeAddress(right);
};

export function isExcludedXorBurnAddress(address: string): boolean {
  return EXCLUDED_XOR_BURN_ADDRESSES.some((excludedAddress) => isSameAddress(address, excludedAddress));
}

const filterEligibleBurns = (items: XorBurn[]): XorBurn[] => {
  return items.filter((item) => !isExcludedXorBurnAddress(item.address));
};

const getEventExtrinsicIndex = (eventRecord: ApiEventRecord): Nullable<number> => {
  const { phase } = eventRecord;
  if (!phase?.isApplyExtrinsic || phase.asApplyExtrinsic === undefined) return null;

  if (typeof phase.asApplyExtrinsic === 'number') return phase.asApplyExtrinsic;

  const value = phase.asApplyExtrinsic;
  const numericValue = typeof value.toNumber === 'function' ? value.toNumber() : Number(value.toString());
  return Number.isFinite(numericValue) ? numericValue : null;
};

const getBlockExtrinsicHashes = (signedBlock: SignedBlock): string[] => {
  return signedBlock.block?.extrinsics?.map((extrinsic) => extrinsic.hash?.toString() ?? '') ?? [];
};

const getIterableCalls = (value: unknown): SignedExtrinsicCall[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as SignedExtrinsicCall[];

  const calls: SignedExtrinsicCall[] = [];
  const forEach = (value as { forEach?: (callback: (call: SignedExtrinsicCall) => void) => void }).forEach;

  if (typeof forEach === 'function') {
    forEach.call(value, (call) => calls.push(call));
    return calls;
  }

  try {
    return Array.from(value as Iterable<SignedExtrinsicCall>);
  } catch {
    return [];
  }
};

const isSignedXorBurnCall = (call: Nullable<SignedExtrinsicCall>): boolean => {
  if (!call || call.section !== 'assets' || call.method !== 'burn') return false;

  return getAssetIdString(call.args?.[0]) === XOR.address;
};

const getSignedExtrinsicNexusRecipient = (method: Nullable<SignedExtrinsicMethod>): string | undefined => {
  if (!method || method.section !== 'utility' || method.method !== 'batchAll') return undefined;

  const calls = getIterableCalls(method.args?.[0]);
  const [burnCall, remarkCall] = calls;

  if (
    calls.length !== 2 ||
    !isSignedXorBurnCall(burnCall) ||
    remarkCall?.section !== 'system' ||
    remarkCall.method !== 'remark'
  ) {
    return undefined;
  }

  const remark = parseSoraNexusXorBurnRemark(decodeRemarkText(remarkCall.args?.[0]));

  return remark?.recipient;
};

const getBlockExtrinsicNexusRecipients = (signedBlock: SignedBlock): Array<string | undefined> => {
  return signedBlock.block?.extrinsics?.map((extrinsic) => getSignedExtrinsicNexusRecipient(extrinsic.method)) ?? [];
};

const getXorBurnEventData = (eventRecord: ApiEventRecord): Nullable<OnChainBurnEventData> => {
  const { event } = eventRecord;
  if (event.section !== 'assets' || event.method.toLowerCase() !== 'burn') return null;

  const [first, second, third] = event.data;
  const [address, assetId, amount] =
    getAssetIdString(first) === XOR.address ? [second, first, third] : [first, second, third];

  if (!address || !assetId || !amount || getAssetIdString(assetId) !== XOR.address) return null;

  return {
    address: address.toString(),
    amount: amount.toString(),
    extrinsicIndex: getEventExtrinsicIndex(eventRecord),
  };
};

const parseOnChainBurnEvents = (
  blockHeight: number,
  events: ApiEventRecord[],
  txHashes: string[],
  nexusRecipients: Array<string | undefined>
): XorBurn[] => {
  return events.flatMap((eventRecord) => {
    const burn = getXorBurnEventData(eventRecord);
    if (!burn) return [];
    const extrinsicIndex = burn.extrinsicIndex;

    return [
      {
        address: burn.address,
        amount: FPNumber.fromCodecValue(burn.amount, XOR.decimals),
        blockHeight,
        nexusRecipient: extrinsicIndex === null ? undefined : nexusRecipients[extrinsicIndex],
        txHash: extrinsicIndex === null ? undefined : txHashes[extrinsicIndex],
      },
    ];
  });
};

const dedupeBurns = (items: XorBurn[]): XorBurn[] => {
  const seen = new Map<string, XorBurn>();
  const result: XorBurn[] = [];

  for (const item of items) {
    const key = `${item.address}:${item.blockHeight}:${item.amount.toString()}:${item.txHash ?? ''}`;
    const existing = seen.get(key);

    if (existing) {
      existing.nexusRecipient ??= item.nexusRecipient;
      continue;
    }

    seen.set(key, item);
    result.push(item);
  }

  return result;
};

/**
 * Defers broad RPC scans so the UI can render indexer and SoraMetrics results first.
 */
const scheduleBackgroundScan = (callback: VoidFunction): void => {
  setTimeout(callback, 0);
};

/**
 * Runs RPC reads with bounded parallelism so global SoraMetrics verification is fast without flooding the node.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const result: R[] = [];
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      result[currentIndex] = await mapper(items[currentIndex] as T);
    }
  });

  await Promise.all(workers);

  return result;
}

async function scanOnChainRanges(
  ranges: Array<[number, number]>,
  chainApi: NonNullable<ReturnType<typeof getChainApi>>
): Promise<void> {
  for (const [rangeStart, rangeEnd] of ranges) {
    const blocks = getBlockRange(rangeStart, rangeEnd);

    for (let index = 0; index < blocks.length; index += ON_CHAIN_SCAN_CHUNK_SIZE) {
      const chunk = blocks.slice(index, index + ON_CHAIN_SCAN_CHUNK_SIZE);
      const blockHashes = await Promise.all(chunk.map((blockHeight) => chainApi.rpc.chain.getBlockHash(blockHeight)));
      const [eventsByBlock, signedBlocks] = await Promise.all([
        Promise.all(blockHashes.map((blockHash) => chainApi.query.system.events.at(blockHash))),
        Promise.all(blockHashes.map((blockHash) => chainApi.rpc.chain.getBlock(blockHash))),
      ]);
      const txHashesByBlock = (signedBlocks as SignedBlock[]).map(getBlockExtrinsicHashes);
      const nexusRecipientsByBlock = (signedBlocks as SignedBlock[]).map(getBlockExtrinsicNexusRecipients);
      const burns = eventsByBlock.flatMap((events, eventIndex) =>
        parseOnChainBurnEvents(
          chunk[eventIndex] ?? 0,
          events as unknown as ApiEventRecord[],
          txHashesByBlock[eventIndex] ?? [],
          nexusRecipientsByBlock[eventIndex] ?? []
        )
      );

      onChainBurnCache.burns.push(...burns);
    }

    onChainBurnCache.start = onChainBurnCache.start ? Math.min(onChainBurnCache.start, rangeStart) : rangeStart;
    onChainBurnCache.end = Math.max(onChainBurnCache.end, rangeEnd);
  }
}

function queueOnChainScan(
  ranges: Array<[number, number]>,
  chainApi: NonNullable<ReturnType<typeof getChainApi>>
): void {
  if (onChainScanPromise) return;

  onChainScanPromise = Promise.resolve();
  scheduleBackgroundScan(() => {
    onChainScanPromise = scanOnChainRanges(ranges, chainApi)
      .catch((error: unknown) => {
        console.error('Failed to scan XOR burn events from historical blocks:', error);
      })
      .finally(() => {
        onChainScanPromise = null;
      });
  });
}

const getAccountOnChainBurnCache = (accountId: string): AccountOnChainBurnCache => {
  const key = normalizeAddress(accountId);
  accountOnChainBurnCaches[key] ??= {
    start: 0,
    end: 0,
    burns: [],
    promise: null,
  };

  return accountOnChainBurnCaches[key];
};

async function fetchSoraMetricsExtrinsics(section: string, method: string): Promise<SoraMetricsExtrinsic[]> {
  if (typeof fetch !== 'function') return [];

  const cacheKey = `${section}:${method}`;
  const now = Date.now();
  const cached = soraMetricsExtrinsicsCache[cacheKey];

  if (cached && cached.expiresAt > now) return cached.promise;

  const fetchPage = async (page: number): Promise<SoraMetricsExtrinsic[]> => {
    const params = new URLSearchParams({
      limit: String(SORA_METRICS_PAGE_LIMIT),
      page: String(page),
      section,
      method,
    });

    try {
      const response = await fetch(`${SORA_METRICS_BASE_URL}/history/global/extrinsics?${params.toString()}`);
      if (!response.ok) return [];

      const json = (await response.json()) as SoraMetricsExtrinsicsResponse;
      return Array.isArray(json.data) ? json.data : [];
    } catch {
      return [];
    }
  };

  const promise = Promise.all(
    Array.from({ length: SORA_METRICS_PAGE_COUNT }, (_, index) => fetchPage(index + 1))
  ).then((pages) => pages.flat());

  soraMetricsExtrinsicsCache[cacheKey] = {
    expiresAt: now + SORA_METRICS_CACHE_TTL_MS,
    promise,
  };

  return promise;
}

async function fetchSoraMetricsBurnCandidateExtrinsics(): Promise<SoraMetricsExtrinsic[]> {
  const [batchAllItems, batchItems, burnItems] = await Promise.all([
    fetchSoraMetricsExtrinsics('utility', 'batchAll'),
    fetchSoraMetricsExtrinsics('utility', 'batch'),
    fetchSoraMetricsExtrinsics('assets', 'burn'),
  ]);

  return [...batchAllItems, ...batchItems, ...burnItems];
}

async function fetchSoraMetricsAccountXorBurns(
  start: number,
  end: number,
  accountId: string,
  chainApi: NonNullable<ReturnType<typeof getChainApi>>
): Promise<XorBurn[]> {
  const burnCandidateItems = await fetchSoraMetricsBurnCandidateExtrinsics();
  const candidateKeys = new Set<string>();
  const candidates = burnCandidateItems.filter((item) => {
    const blockHeight = Number(item.block);
    const extrinsicIndex = Number(item.extrinsic_index);
    const candidateKey = `${item.hash ?? ''}:${blockHeight}:${extrinsicIndex}`;
    const matches =
      Number.isFinite(blockHeight) &&
      blockHeight >= start &&
      blockHeight <= end &&
      item.hash &&
      item.signer &&
      item.success !== false &&
      item.success !== 0 &&
      isSameAddress(item.signer, accountId) &&
      !candidateKeys.has(candidateKey);

    if (matches) candidateKeys.add(candidateKey);

    return matches;
  });
  const burns: XorBurn[] = [];

  for (const candidate of candidates) {
    const blockHeight = Number(candidate.block);
    const extrinsicIndex = Number(candidate.extrinsic_index);

    if (!Number.isFinite(blockHeight) || !Number.isFinite(extrinsicIndex) || !candidate.hash) continue;

    try {
      const blockHash = await chainApi.rpc.chain.getBlockHash(blockHeight);
      const [events, signedBlock] = await Promise.all([
        chainApi.query.system.events.at(blockHash),
        chainApi.rpc.chain.getBlock(blockHash),
      ]);
      const nexusRecipient = getBlockExtrinsicNexusRecipients(signedBlock as SignedBlock)[extrinsicIndex];

      for (const eventRecord of events as unknown as ApiEventRecord[]) {
        if (getEventExtrinsicIndex(eventRecord) !== extrinsicIndex) continue;

        const burn = getXorBurnEventData(eventRecord);

        if (burn && isSameAddress(burn.address, accountId)) {
          burns.push({
            address: burn.address,
            amount: FPNumber.fromCodecValue(burn.amount, XOR.decimals),
            blockHeight,
            nexusRecipient,
            txHash: candidate.hash,
          });
        }
      }
    } catch {
      // SoraMetrics is only a hint source; direct RPC scanning continues below.
    }
  }

  return dedupeBurns(burns);
}

async function fetchSoraMetricsGlobalXorBurns(
  start: number,
  end: number,
  chainApi: NonNullable<ReturnType<typeof getChainApi>>
): Promise<XorBurn[]> {
  const burnCandidateItems = await fetchSoraMetricsBurnCandidateExtrinsics();
  const candidateKeys = new Set<string>();
  const candidates = burnCandidateItems.filter((item) => {
    const blockHeight = Number(item.block);
    const extrinsicIndex = Number(item.extrinsic_index);
    const candidateKey = `${item.hash ?? ''}:${blockHeight}:${extrinsicIndex}`;
    const matches =
      Number.isFinite(blockHeight) &&
      blockHeight >= start &&
      blockHeight <= end &&
      Number.isFinite(extrinsicIndex) &&
      !!item.hash &&
      item.success !== false &&
      item.success !== 0 &&
      !candidateKeys.has(candidateKey);

    if (matches) candidateKeys.add(candidateKey);

    return matches;
  });
  const candidatesByBlock = new Map<number, Map<number, string>>();

  for (const candidate of candidates) {
    const blockHeight = Number(candidate.block);
    const extrinsicIndex = Number(candidate.extrinsic_index);
    const txHash = String(candidate.hash ?? '');
    const extrinsicCandidates = candidatesByBlock.get(blockHeight) ?? new Map<number, string>();

    extrinsicCandidates.set(extrinsicIndex, txHash);
    candidatesByBlock.set(blockHeight, extrinsicCandidates);
  }

  const burnsByBlock = await mapWithConcurrency(
    Array.from(candidatesByBlock.entries()),
    SORA_METRICS_RPC_CONCURRENCY,
    async ([blockHeight, extrinsicCandidates]) => {
      const blockBurns: XorBurn[] = [];

      try {
        const blockHash = await chainApi.rpc.chain.getBlockHash(blockHeight);
        const [events, signedBlock] = await Promise.all([
          chainApi.query.system.events.at(blockHash),
          chainApi.rpc.chain.getBlock(blockHash),
        ]);
        const nexusRecipients = getBlockExtrinsicNexusRecipients(signedBlock as SignedBlock);

        for (const eventRecord of events as unknown as ApiEventRecord[]) {
          const extrinsicIndex = getEventExtrinsicIndex(eventRecord);
          if (extrinsicIndex === null || !extrinsicCandidates.has(extrinsicIndex)) continue;

          const burn = getXorBurnEventData(eventRecord);

          if (burn) {
            blockBurns.push({
              address: burn.address,
              amount: FPNumber.fromCodecValue(burn.amount, XOR.decimals),
              blockHeight,
              nexusRecipient: nexusRecipients[extrinsicIndex],
              txHash: extrinsicCandidates.get(extrinsicIndex),
            });
          }
        }
      } catch {
        // SoraMetrics only narrows candidate transactions; broad RPC scanning continues below.
      }

      return blockBurns;
    }
  );

  return dedupeBurns(burnsByBlock.flat());
}

async function scanAccountOnChainRange(
  rangeStart: number,
  rangeEnd: number,
  accountId: string,
  cache: AccountOnChainBurnCache,
  chainApi: NonNullable<ReturnType<typeof getChainApi>>
): Promise<void> {
  const blocks = getReverseBlockRange(rangeStart, rangeEnd);

  for (let index = 0; index < blocks.length; index += ON_CHAIN_SCAN_CHUNK_SIZE) {
    const chunk = blocks.slice(index, index + ON_CHAIN_SCAN_CHUNK_SIZE);
    const blockHashes = await Promise.all(chunk.map((blockHeight) => chainApi.rpc.chain.getBlockHash(blockHeight)));
    const eventsByBlock = await Promise.all(blockHashes.map((blockHash) => chainApi.query.system.events.at(blockHash)));
    const burnsWithHashLookup: Array<{ blockHash: unknown; blockHeight: number; burn: OnChainBurnEventData }> = [];

    eventsByBlock.forEach((events, eventIndex) => {
      const blockHeight = chunk[eventIndex] ?? 0;
      const blockHash = blockHashes[eventIndex];

      for (const eventRecord of events as unknown as ApiEventRecord[]) {
        const burn = getXorBurnEventData(eventRecord);

        if (burn && isSameAddress(burn.address, accountId)) {
          burnsWithHashLookup.push({ blockHash, blockHeight, burn });
        }
      }
    });

    for (const { blockHash, blockHeight, burn } of burnsWithHashLookup) {
      const signedBlock = (await chainApi.rpc.chain.getBlock(blockHash)) as SignedBlock;
      const txHashes = getBlockExtrinsicHashes(signedBlock);
      const nexusRecipients = getBlockExtrinsicNexusRecipients(signedBlock);
      const extrinsicIndex = burn.extrinsicIndex;

      cache.burns.push({
        address: burn.address,
        amount: FPNumber.fromCodecValue(burn.amount, XOR.decimals),
        blockHeight,
        nexusRecipient: extrinsicIndex === null ? undefined : nexusRecipients[extrinsicIndex],
        txHash: extrinsicIndex === null ? undefined : txHashes[extrinsicIndex],
      });
    }

    const chunkStart = Math.min(...chunk);
    const chunkEnd = Math.max(...chunk);
    cache.start = cache.start ? Math.min(cache.start, chunkStart) : chunkStart;
    cache.end = Math.max(cache.end, chunkEnd);
  }
}

function queueAccountOnChainScan(
  rangeStart: number,
  rangeEnd: number,
  accountId: string,
  cache: AccountOnChainBurnCache,
  chainApi: NonNullable<ReturnType<typeof getChainApi>>
): void {
  if (cache.promise || rangeEnd < rangeStart) return;

  cache.promise = Promise.resolve();
  scheduleBackgroundScan(() => {
    cache.promise = scanAccountOnChainRange(rangeStart, rangeEnd, accountId, cache, chainApi)
      .catch((error: unknown) => {
        console.error(`Failed to scan XOR burn events for ${accountId}:`, error);
      })
      .finally(() => {
        cache.promise = null;
      });
  });
}

async function fetchAccountOnChainXorBurns(start: number, end: number, accountId: string): Promise<XorBurn[]> {
  const chainApi = getChainApi();
  const from = Math.max(start, SORA_XOR_BURN_START_BLOCK);

  if (!chainApi || end < from) return [];

  const cache = getAccountOnChainBurnCache(accountId);

  if (!isChainApiReady(chainApi)) {
    return cache.burns.filter(({ blockHeight }) => blockHeight >= from && blockHeight <= end);
  }

  const metricsBurns = await fetchSoraMetricsAccountXorBurns(from, end, accountId, chainApi);

  cache.burns = dedupeBurns([...cache.burns, ...metricsBurns]);

  const missingRanges: Array<[number, number]> = [];

  if (!cache.start) {
    missingRanges.push([from, end]);
  } else {
    if (end > cache.end) {
      missingRanges.push([cache.end + 1, end]);
    }

    if (from < cache.start) {
      missingRanges.push([from, cache.start - 1]);
    }
  }

  for (const [rangeStart, rangeEnd] of missingRanges) {
    const blockCount = rangeEnd - rangeStart + 1;

    if (blockCount <= ACCOUNT_ON_CHAIN_SCAN_SYNC_BLOCK_LIMIT) {
      await scanAccountOnChainRange(rangeStart, rangeEnd, accountId, cache, chainApi);
      continue;
    }

    const syncStart = Math.max(rangeStart, rangeEnd - ACCOUNT_ON_CHAIN_SCAN_SYNC_BLOCK_LIMIT + 1);
    queueAccountOnChainScan(syncStart, rangeEnd, accountId, cache, chainApi);
  }

  return cache.burns.filter(({ blockHeight }) => blockHeight >= from && blockHeight <= end);
}

/**
 * Fetches SOLSWAP campaign XOR burns directly from chain events when the
 * public indexer has not indexed campaign blocks yet.
 */
async function fetchOnChainXorBurns(start: number, end: number): Promise<XorBurn[]> {
  const chainApi = getChainApi();
  const from = Math.max(start, SORA_XOR_BURN_START_BLOCK);

  if (!chainApi || end < from) return [];
  if (!isChainApiReady(chainApi)) {
    return onChainBurnCache.burns.filter(({ blockHeight }) => blockHeight >= from && blockHeight <= end);
  }

  const metricsBurns = await fetchSoraMetricsGlobalXorBurns(from, end, chainApi);

  onChainBurnCache.burns = dedupeBurns([...onChainBurnCache.burns, ...metricsBurns]);

  const missingRanges: Array<[number, number]> = [];

  if (!onChainBurnCache.start) {
    missingRanges.push([from, end]);
  } else {
    if (from < onChainBurnCache.start) {
      missingRanges.push([from, onChainBurnCache.start - 1]);
    }

    if (end > onChainBurnCache.end) {
      missingRanges.push([onChainBurnCache.end + 1, end]);
    }
  }

  const missingBlockCount = missingRanges.reduce((total, [rangeStart, rangeEnd]) => {
    return total + Math.max(rangeEnd - rangeStart + 1, 0);
  }, 0);

  try {
    if (missingBlockCount > ON_CHAIN_SCAN_SYNC_BLOCK_LIMIT) {
      const recentRanges = missingRanges
        .map(([rangeStart, rangeEnd]): [number, number] => [
          Math.max(rangeStart, rangeEnd - ON_CHAIN_SCAN_SYNC_BLOCK_LIMIT + 1),
          rangeEnd,
        ])
        .filter(([rangeStart, rangeEnd]) => rangeStart <= rangeEnd);

      queueOnChainScan(recentRanges, chainApi);
    } else if (missingRanges.length) {
      await scanOnChainRanges(missingRanges, chainApi);
    }
  } catch {
    return onChainBurnCache.burns.filter(({ blockHeight }) => blockHeight >= from && blockHeight <= end);
  }

  return onChainBurnCache.burns.filter(({ blockHeight }) => blockHeight >= from && blockHeight <= end);
}

export async function fetchData(start: number, end: number, accountId?: string): Promise<XorBurn[]> {
  if (accountId && isExcludedXorBurnAddress(accountId)) return [];

  const indexer = getCurrentIndexer();
  const variables = { start, end };

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const items = await subqueryIndexer.services.explorer.fetchAllEntities(
        getSubqueryXorBurnQuery(accountId),
        variables,
        parse
      );
      const parsedItems = (items ?? []).filter((item): item is XorBurn => !!item);
      const initData = accountId
        ? dataBeforeSubqueryIndexing.filter((item) => item.address === accountId)
        : dataBeforeSubqueryIndexing;
      const onChainItems = accountId
        ? await fetchAccountOnChainXorBurns(start, end, accountId)
        : await fetchOnChainXorBurns(start, end);
      const filteredOnChainItems = accountId
        ? onChainItems.filter((item) => isSameAddress(item.address, accountId))
        : onChainItems;
      return filterEligibleBurns(dedupeBurns([...parsedItems, ...filteredOnChainItems, ...initData]));
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      const items = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        getSubsquidXorBurnQuery(accountId),
        variables,
        parse
      );
      const parsedItems = (items ?? []).filter((item): item is XorBurn => !!item);
      const onChainItems = accountId
        ? await fetchAccountOnChainXorBurns(start, end, accountId)
        : await fetchOnChainXorBurns(start, end);
      const filteredOnChainItems = accountId
        ? onChainItems.filter((item) => isSameAddress(item.address, accountId))
        : onChainItems;
      return filterEligibleBurns(dedupeBurns([...parsedItems, ...filteredOnChainItems]));
    }
  }

  return [];
}
