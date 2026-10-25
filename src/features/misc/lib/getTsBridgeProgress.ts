import { FPNumber, Operation } from '@sora-substrate/sdk';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import { areBridgeExternalAccountsEqual } from '@/utils/bridge/common/account';
import type { GetTsPurpose } from './getTsFlow';
import { getTonswapBridgeFundingPurpose } from './tonswapBridgeLiquidity';
import { getTsContextHash } from './getTsContextHash';
import {
  isGetTsBridgeDraftId,
  isGetTsTransactionReference,
  normalizeGetTsAmount,
  type GetTsBridgeDraft,
} from './getTsPlan';

export type GetTsBridgeProgressState = 'idle' | 'unavailable' | 'pending' | 'received' | 'failed';
export interface GetTsBridgeProgress {
  state: GetTsBridgeProgressState;
  reference?: string;
  historyId?: string;
  amount?: string;
  finalizedBlock?: string;
}
export interface GetTsBridgeContext {
  reference: string;
  soraAddress: string;
  evmAddress: string;
  mainnet: boolean;
  purpose?: GetTsPurpose;
}
export interface GetTsFinalizedBridgeRequest {
  status: string | null;
  finalizedBlock: string;
  ethereumHash?: string;
  from?: string;
  to?: string;
  assetAddress?: string;
  amountCodec?: string;
}

/** Captures only the exact reviewed incoming DAI row; public wallet addresses stay outside the plan. */
export function createGetTsBridgeDraft(row: EthHistory, purpose: GetTsPurpose): GetTsBridgeDraft | null {
  const amount = normalizeGetTsAmount(row.amount);
  if (
    !isGetTsBridgeDraftId(row.id) ||
    !amount ||
    row.type !== Operation.EthBridgeIncoming ||
    row.externalNetwork !== 1 ||
    row.assetAddress !== DAI.address ||
    getTonswapBridgeFundingPurpose(row) !== purpose ||
    typeof row.from !== 'string' ||
    !row.from ||
    row.from.length > 128 ||
    typeof row.to !== 'string' ||
    !row.to ||
    row.to.length > 128
  )
    return null;
  return {
    id: row.id,
    amount,
    contextHash: getTsContextHash(
      JSON.stringify([
        purpose,
        row.id,
        row.type,
        row.externalNetwork,
        row.assetAddress,
        row.from,
        row.to.toLowerCase(),
        amount,
      ])
    ),
  };
}

/** A draft binds one immutable reviewed row and currently connected accounts, never a best-match history search. */
export function matchGetTsBridgeDraft(
  row: EthHistory,
  draft: GetTsBridgeDraft,
  context: Omit<GetTsBridgeContext, 'reference'> & { purpose: GetTsPurpose }
): boolean {
  if (
    !context.mainnet ||
    !areBridgeExternalAccountsEqual(row.from, context.soraAddress) ||
    !areBridgeExternalAccountsEqual(row.to, context.evmAddress)
  )
    return false;
  const actual = createGetTsBridgeDraft(row, context.purpose);
  return (
    !!actual && actual.id === draft.id && actual.amount === draft.amount && actual.contextHash === draft.contextHash
  );
}

/** Matches an explicit submitted Ethereum hash to the same accounts, asset, direction and mainnet. */
export function matchGetTsBridgeHistory(
  history: readonly EthHistory[],
  context: GetTsBridgeContext
): EthHistory | null {
  if (!context.mainnet || !isGetTsTransactionReference(context.reference)) return null;
  return (
    history.find(
      (row) =>
        (!context.purpose || getTonswapBridgeFundingPurpose(row) === context.purpose) &&
        row.type === Operation.EthBridgeIncoming &&
        row.externalNetwork === 1 &&
        row.assetAddress === DAI.address &&
        row.externalHash?.toLowerCase() === context.reference.toLowerCase() &&
        areBridgeExternalAccountsEqual(row.from, context.soraAddress) &&
        areBridgeExternalAccountsEqual(row.to, context.evmAddress) &&
        normalizeGetTsAmount(row.amount)
    ) ?? null
  );
}

/** Completion requires finalized matching transfer data; persisted history status and balances are insufficient. */
export function evaluateGetTsBridgeProgress(
  row: EthHistory,
  request: GetTsFinalizedBridgeRequest
): GetTsBridgeProgress {
  const base = { reference: row.externalHash, historyId: row.id, amount: row.amount };
  if (!isGetTsTransactionReference(request.finalizedBlock)) return { ...base, state: 'unavailable' };
  if (!request.status || request.status === BridgeTxStatus.Pending || request.status === BridgeTxStatus.Ready)
    return { ...base, state: 'pending', finalizedBlock: request.finalizedBlock };
  const matched =
    request.ethereumHash?.toLowerCase() === row.externalHash?.toLowerCase() &&
    request.assetAddress === DAI.address &&
    areBridgeExternalAccountsEqual(request.from, row.to) &&
    areBridgeExternalAccountsEqual(request.to, row.from) &&
    typeof request.amountCodec === 'string' &&
    /^\d{1,78}$/.test(request.amountCodec) &&
    !!row.amount &&
    FPNumber.fromCodecValue(request.amountCodec, DAI.decimals).eq(new FPNumber(row.amount));
  if (!matched) return { ...base, state: 'unavailable' };
  if (request.status === BridgeTxStatus.Done)
    return { ...base, state: 'received', finalizedBlock: request.finalizedBlock };
  if ([BridgeTxStatus.Failed, BridgeTxStatus.Broken, BridgeTxStatus.Frozen].includes(request.status as BridgeTxStatus))
    return { ...base, state: 'failed', finalizedBlock: request.finalizedBlock };
  return { ...base, state: 'unavailable' };
}
