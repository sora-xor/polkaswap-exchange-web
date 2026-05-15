import { FPNumber, type HistoryItem, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';

import { parseSoraNexusXorBurnRemark } from '@/utils/soraNexusAccount';

import type { Nullable } from '@/types/common';
import type { BurnForStats } from '@/features/misc/lib/burnCampaigns';

export type LocalBurnHistoryItem = HistoryItem & {
  amount?: string;
  assetAddress?: string;
  blockHeight?: number;
  blockId?: string;
  comment?: string;
  from?: string;
  id?: string;
  txId?: string;
  type?: Operation;
};

export type ChainApiHeaderShape = {
  isConnected?: boolean;
  rpc?: {
    chain?: {
      getHeader?: (blockHash?: string) => Promise<{ number?: { toString?: () => string } }>;
    };
  };
};

export type CreateLocalXorBurnsParams = {
  address: Nullable<string>;
  fallbackBlockHeight: number;
  localHistory: LocalBurnHistoryItem[];
  resolveBlockHeightByBlockId: (blockId?: string) => Promise<Nullable<number>>;
  isExcludedAddress?: (address: string) => boolean;
};

/**
 * Returns the persisted transaction hash field used by wallet history variants.
 */
export const getLocalTxHash = (item: LocalBurnHistoryItem): string => item.txId || item.id || '';

/**
 * Identifies local wallet history rows that represent optimistic XOR burns.
 */
export const isLocalXorBurn = (item: LocalBurnHistoryItem): boolean => {
  return item.type === Operation.Burn && item.assetAddress === XOR.address && !!item.amount && !!getLocalTxHash(item);
};

/**
 * Parses a chain header into a finite block height.
 */
export const resolveBlockHeightFromHeader = (
  header?: Nullable<{ number?: { toString?: () => string } }>
): Nullable<number> => {
  const rawBlockHeight = header?.number?.toString?.();
  const blockHeight = rawBlockHeight ? Number(rawBlockHeight) : Number.NaN;

  return Number.isFinite(blockHeight) ? blockHeight : null;
};

/**
 * Reads the latest chain block height from a connected wallet API.
 */
export async function getCurrentChainBlockHeight(chainApi: Nullable<ChainApiHeaderShape>): Promise<Nullable<number>> {
  try {
    if (!chainApi || chainApi.isConnected === false || typeof chainApi.rpc?.chain?.getHeader !== 'function') {
      return null;
    }

    return resolveBlockHeightFromHeader(await chainApi.rpc.chain.getHeader());
  } catch {
    return null;
  }
}

/**
 * Reads a historical block height for a local history block hash.
 */
export async function getBlockHeightFromBlockId(
  chainApi: Nullable<ChainApiHeaderShape>,
  blockId?: string
): Promise<Nullable<number>> {
  if (!blockId) return null;

  try {
    if (typeof chainApi?.rpc?.chain?.getHeader !== 'function') {
      return null;
    }

    return resolveBlockHeightFromHeader(await chainApi.rpc.chain.getHeader(blockId));
  } catch {
    return null;
  }
}

/**
 * Resolves the inclusive upper block for campaign queries from app state, chain
 * state, and the campaign bounds.
 */
export const resolveCurrentEndBlock = ({
  blockNumber,
  minBlock,
  maxBlock,
  chainBlockHeight,
}: {
  blockNumber: number;
  minBlock: number;
  maxBlock: number;
  chainBlockHeight?: Nullable<number>;
}): number => {
  if (blockNumber >= minBlock) {
    return Math.min(maxBlock, blockNumber);
  }

  if (chainBlockHeight !== null && chainBlockHeight !== undefined && chainBlockHeight >= minBlock) {
    return Math.min(maxBlock, chainBlockHeight);
  }

  return maxBlock;
};

/**
 * Converts optimistic wallet history rows into the burn-statistics shape used
 * by campaign totals before the public indexer catches up.
 */
export async function createLocalXorBurns({
  address,
  fallbackBlockHeight,
  localHistory,
  resolveBlockHeightByBlockId,
  isExcludedAddress,
}: CreateLocalXorBurnsParams): Promise<BurnForStats[]> {
  if (!address) return [];
  if (isExcludedAddress?.(address)) return [];

  const rows = await Promise.all(
    localHistory.filter(isLocalXorBurn).map(async (item): Promise<BurnForStats> => {
      const exactBlockHeight = item.blockHeight ?? (await resolveBlockHeightByBlockId(item.blockId));
      const blockHeight = exactBlockHeight ?? fallbackBlockHeight;
      const nexusRemark = item.comment ? parseSoraNexusXorBurnRemark(item.comment) : null;

      return {
        address,
        amount: new FPNumber(item.amount as string),
        blockHeight,
        displayBlockHeight: exactBlockHeight,
        nexusRecipient: nexusRemark?.recipient,
        txHash: getLocalTxHash(item),
      };
    })
  );

  return rows;
}
