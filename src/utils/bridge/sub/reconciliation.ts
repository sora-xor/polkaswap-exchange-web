import { Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeTransactionData } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { Nullable } from '@/types/common';

export const SubBridgeAuthoritativeStatus = {
  Pending: 'Pending',
  Done: 'Done',
  Failed: 'Failed',
  Refunded: 'Refunded',
} as const;

export type SubBridgeAuthoritativeStatus =
  (typeof SubBridgeAuthoritativeStatus)[keyof typeof SubBridgeAuthoritativeStatus];

/** Durable history payload metadata written after an authoritative SORA storage reconciliation. */
export type SubBridgeRecoveryPayload = {
  bridgeRecoveryStatus?: SubBridgeAuthoritativeStatus;
  /** Provenance marker for a settlement-only row that cannot be retried or signed. */
  subBridgeHistoryRecovery?: {
    version: 1;
    source: 'sorametrics+polkaswap-indexer';
    mode: 'display-only';
    settlementVerified: true;
  };
};

/** Canonical immutable provenance for a settlement-only recovered history row. */
export const SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY = Object.freeze({
  version: 1 as const,
  source: 'sorametrics+polkaswap-indexer' as const,
  mode: 'display-only' as const,
  settlementVerified: true as const,
});

/** Returns true only for the exact marker on the expected bridge family. */
export const isDisplayOnlyRecoveredSubBridgeHistory = (history: { payload?: unknown } | null | undefined): boolean => {
  if (!history || typeof history !== 'object') return false;

  const family = history as {
    type?: unknown;
    externalNetworkType?: unknown;
    externalNetwork?: unknown;
  };

  if (
    family.type !== Operation.SubstrateIncoming ||
    family.externalNetworkType !== BridgeNetworkType.Sub ||
    family.externalNetwork !== SubNetworkId.Liberland
  ) {
    return false;
  }

  const payload = history?.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;

  const recovery = (payload as SubBridgeRecoveryPayload).subBridgeHistoryRecovery;

  if (!recovery || typeof recovery !== 'object' || Array.isArray(recovery)) return false;
  if (Object.keys(recovery).sort().join(',') !== 'mode,settlementVerified,source,version') return false;

  return Boolean(
    recovery.version === 1 &&
    recovery.source === 'sorametrics+polkaswap-indexer' &&
    recovery.mode === 'display-only' &&
    recovery.settlementVerified === true
  );
};

export const SubBridgeReconciliationErrorCode = {
  Failed: 'SUB_BRIDGE_REQUEST_FAILED',
  Refunded: 'SUB_BRIDGE_REQUEST_REFUNDED',
  InvalidEndBlock: 'SUB_BRIDGE_REQUEST_INVALID_END_BLOCK',
  SourceEventsIncomplete: 'SUB_BRIDGE_SOURCE_EVENTS_INCOMPLETE',
  TrackingTimeout: 'SUB_BRIDGE_TRACKING_TIMEOUT',
} as const;

export type SubBridgeReconciliationErrorCode =
  (typeof SubBridgeReconciliationErrorCode)[keyof typeof SubBridgeReconciliationErrorCode];

export type SubBridgeRequestReconciliation = {
  status: SubBridgeAuthoritativeStatus;
  transaction: Nullable<BridgeTransactionData>;
  endBlock: Nullable<number>;
};

type BridgeMessageStatusLike = {
  isCommitted?: boolean;
  isDone?: boolean;
  isFailed?: boolean;
  isRefunded?: boolean;
  type?: string;
  toString?: () => string;
};

type BridgeTimepointLike = {
  isEvm?: boolean;
  isParachain?: boolean;
  isSora?: boolean;
  asEvm?: { toNumber?: () => number };
  asParachain?: { toNumber?: () => number };
  asSora?: { toNumber?: () => number };
};

/** Reads a numeric completion block from the runtime's generic timepoint codec. */
const fromRuntimeTimepoint = (timepoint?: BridgeTimepointLike): Nullable<number> => {
  const codec = timepoint?.isSora
    ? timepoint.asSora
    : timepoint?.isParachain
      ? timepoint.asParachain
      : timepoint?.isEvm
        ? timepoint.asEvm
        : null;
  const value = codec?.toNumber?.();

  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
};

/** Maps the SDK's lossy common bridge status to the recovery status used by the client. */
const fromBridgeTxStatus = (status: BridgeTxStatus): SubBridgeAuthoritativeStatus => {
  if (status === BridgeTxStatus.Done) return SubBridgeAuthoritativeStatus.Done;
  if (status === BridgeTxStatus.Failed) return SubBridgeAuthoritativeStatus.Failed;

  return SubBridgeAuthoritativeStatus.Pending;
};

/** Preserves the runtime's distinct Refunded state before the SDK collapses it into Failed. */
const fromRuntimeStatus = (status: BridgeMessageStatusLike): Nullable<SubBridgeAuthoritativeStatus> => {
  const type = String(status.type ?? status.toString?.() ?? '').toLowerCase();

  if (status.isRefunded || type === 'refunded') return SubBridgeAuthoritativeStatus.Refunded;
  if (status.isFailed || type === 'failed') return SubBridgeAuthoritativeStatus.Failed;
  if (status.isDone || status.isCommitted || type === 'done' || type === 'committed') {
    return SubBridgeAuthoritativeStatus.Done;
  }
  if (type) return SubBridgeAuthoritativeStatus.Pending;

  return null;
};

/**
 * Reads a SORA bridge request directly from storage and combines it with the
 * SDK-formatted transaction. The raw lookup is necessary because the SDK maps
 * both Failed and Refunded to the same generic status.
 */
export const reconcileSubBridgeRequest = async (
  accountAddress: string,
  externalNetwork: SubNetwork,
  hash: string,
  fallbackTransaction?: Nullable<BridgeTransactionData>
): Promise<Nullable<SubBridgeRequestReconciliation>> => {
  let transaction = fallbackTransaction ?? null;

  try {
    transaction = (await subBridgeApi.getTransactionDetails(accountAddress, externalNetwork, hash)) ?? transaction;
  } catch {
    // The raw storage result below can still authoritatively classify a known request.
  }

  let status = transaction ? fromBridgeTxStatus(transaction.status) : null;
  const formattedEndBlock = Number(transaction?.endBlock);
  let endBlock = Number.isSafeInteger(formattedEndBlock) && formattedEndBlock > 0 ? formattedEndBlock : null;

  try {
    const network = subBridgeApi.prepareNetworkParam(externalNetwork);
    const requestOption = await subBridgeApi.api.query.bridgeProxy.transactions([network, accountAddress], hash);

    if (requestOption?.isSome && typeof requestOption.unwrap === 'function') {
      const request = requestOption.unwrap();
      status = fromRuntimeStatus(request.status as BridgeMessageStatusLike) ?? status;
      endBlock = fromRuntimeTimepoint(request.endTimepoint as BridgeTimepointLike) ?? endBlock;
    }
  } catch {
    // Keep the formatted fallback when a node cannot expose the raw codec.
  }

  if (!status) return null;

  return { status, transaction, endBlock };
};

/** Identifies authoritative states in which bridge tracking must stop without resubmitting the source transaction. */
export const isSubBridgeTerminalFailureStatus = (status: SubBridgeAuthoritativeStatus): boolean => {
  return status === SubBridgeAuthoritativeStatus.Failed || status === SubBridgeAuthoritativeStatus.Refunded;
};

/** Returns a stable UI-translatable error code for an authoritative terminal request state. */
export const getSubBridgeFailureCode = (status: SubBridgeAuthoritativeStatus): SubBridgeReconciliationErrorCode => {
  if (status === SubBridgeAuthoritativeStatus.Refunded) {
    return SubBridgeReconciliationErrorCode.Refunded;
  }

  return SubBridgeReconciliationErrorCode.Failed;
};
