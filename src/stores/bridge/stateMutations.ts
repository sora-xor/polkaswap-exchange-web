import { FPNumber } from '@sora-substrate/sdk';

import { ZeroStringValue } from '@/consts';
import { preservePinnedBridgeHistoryTransactions } from '@/stores/bridge/historyRecord';
import { normalizeBridgeHistoryPage } from '@/stores/bridge/state';
import type { BridgeFocusedField, BridgeState } from '@/stores/bridge/types';
import type { Nullable } from '@/types/common';

import type { IBridgeTransaction, CodecString } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { Subscription } from 'rxjs';

export type BridgeStateStoreLike = Pick<
  BridgeState,
  'balances' | 'fees' | 'flags' | 'form' | 'history' | 'subscriptions'
>;

/**
 * Replaces internal bridge history while retaining locally pinned transactions.
 */
export const syncInternalHistoryCompat = (
  store: BridgeStateStoreLike,
  history: Record<string, IBridgeTransaction> = {}
): Record<string, IBridgeTransaction> => {
  const nextHistory = Object.freeze(preservePinnedBridgeHistoryTransactions(store.history, history)) as Record<
    string,
    IBridgeTransaction
  >;

  store.history.internal = nextHistory;

  return nextHistory;
};

/**
 * Normalizes and writes the active bridge history page.
 */
export const syncHistoryPageCompat = (store: BridgeStateStoreLike, page?: number): number => {
  const nextPage = normalizeBridgeHistoryPage(page);

  store.history.page = nextPage;

  return nextPage;
};

/**
 * Writes the active bridge history transaction id.
 */
export const syncHistoryIdCompat = (store: BridgeStateStoreLike, id?: string): string => {
  const nextId = id ?? '';

  store.history.id = nextId;

  return nextId;
};

/**
 * Tracks whether a network history refresh is currently loading.
 */
export const syncHistoryLoadingCompat = (
  store: BridgeStateStoreLike,
  networkId: BridgeNetworkId,
  loading: boolean
): Record<string, boolean> => {
  const nextLoading = { ...store.history.loading } as Record<string, boolean>;

  if (loading) {
    nextLoading[networkId] = true;
  } else {
    delete nextLoading[networkId];
  }

  store.history.loading = nextLoading;

  return nextLoading;
};

/**
 * Writes the bridge balance loading flag.
 */
export const syncBalancesFetchingCompat = (store: BridgeStateStoreLike, flag: boolean): boolean => {
  store.flags.balancesFetching = flag;

  return flag;
};

/**
 * Updates bridge account balances without resetting omitted balance fields.
 */
export const syncBalancesBatchCompat = (
  store: BridgeStateStoreLike,
  data: { sender?: Nullable<CodecString>; recipient?: Nullable<CodecString>; native?: CodecString }
): void => {
  if (data.sender !== undefined) {
    store.balances.assetSenderBalance = data.sender ?? null;
  }
  if (data.recipient !== undefined) {
    store.balances.assetRecipientBalance = data.recipient ?? null;
  }
  if (data.native !== undefined) {
    store.fees.externalNativeBalance = data.native ?? ZeroStringValue;
  }
};

/**
 * Writes a trusted external block number, falling back to zero for invalid input.
 */
export const syncExternalBlockNumberCompat = (store: BridgeStateStoreLike, value?: number): number => {
  const blockNumber = Number.isFinite(Number(value)) ? Number(value) : 0;

  store.fees.externalBlockNumber = blockNumber;

  return store.fees.externalBlockNumber;
};

/**
 * Writes the locked bridge balance.
 */
export const syncAssetLockedBalanceCompat = (
  store: BridgeStateStoreLike,
  value: Nullable<FPNumber>
): Nullable<FPNumber> => {
  store.balances.assetLockedBalance = value ?? null;

  return store.balances.assetLockedBalance;
};

/**
 * Writes the SORA-side network fee.
 */
export const syncSoraNetworkFeeCompat = (store: BridgeStateStoreLike, fee?: Nullable<CodecString>): CodecString => {
  store.fees.soraNetworkFee = fee ?? ZeroStringValue;

  return store.fees.soraNetworkFee;
};

/**
 * Writes the external bridge transfer fee.
 */
export const syncExternalTransferFeeCompat = (
  store: BridgeStateStoreLike,
  fee?: Nullable<CodecString>
): CodecString => {
  store.fees.externalTransferFee = fee ?? ZeroStringValue;

  return store.fees.externalTransferFee;
};

/**
 * Writes the external network fee.
 */
export const syncExternalNetworkFeeCompat = (store: BridgeStateStoreLike, fee?: Nullable<CodecString>): CodecString => {
  store.fees.externalNetworkFee = fee ?? ZeroStringValue;

  return store.fees.externalNetworkFee;
};

/**
 * Writes the fee and locked-funds loading flag.
 */
export const syncFeesAndLockedFundsFetchingCompat = (store: BridgeStateStoreLike, flag: boolean): boolean => {
  store.flags.feesAndLockedFundsFetching = flag;

  return store.flags.feesAndLockedFundsFetching;
};

/**
 * Writes the external minimum balance.
 */
export const syncExternalMinBalanceCompat = (
  store: BridgeStateStoreLike,
  balance?: Nullable<CodecString>
): CodecString => {
  store.balances.assetExternalMinBalance = balance ?? ZeroStringValue;

  return store.balances.assetExternalMinBalance;
};

/**
 * Writes the incoming bridge minimum amount.
 */
export const syncIncomingMinLimitCompat = (store: BridgeStateStoreLike, amount: FPNumber): FPNumber => {
  store.balances.incomingMinLimit = amount ?? FPNumber.ZERO;

  return store.balances.incomingMinLimit;
};

/**
 * Writes the outgoing bridge minimum amount.
 */
export const syncOutgoingMinLimitCompat = (
  store: BridgeStateStoreLike,
  amount: Nullable<FPNumber>
): Nullable<FPNumber> => {
  store.balances.outgoingMinLimit = amount ?? null;

  return store.balances.outgoingMinLimit;
};

/**
 * Writes the outgoing bridge maximum amount.
 */
export const syncOutgoingMaxLimitCompat = (
  store: BridgeStateStoreLike,
  amount: Nullable<FPNumber>
): Nullable<FPNumber> => {
  store.balances.outgoingMaxLimit = amount ?? null;

  return store.balances.outgoingMaxLimit;
};

/**
 * Replaces the outgoing max-limit subscription and clears stale max-limit state.
 */
export const syncOutgoingMaxLimitSubscriptionCompat = (
  store: BridgeStateStoreLike,
  subscription: Nullable<Subscription>
): Nullable<Subscription> => {
  store.subscriptions.outgoingMaxLimit?.unsubscribe?.();
  store.subscriptions.outgoingMaxLimit = subscription ?? null;

  if (!subscription) {
    store.balances.outgoingMaxLimit = null;
  }

  return store.subscriptions.outgoingMaxLimit;
};

/**
 * Replaces the block-update subscription.
 */
export const syncBlockUpdatesSubscriptionCompat = (
  store: BridgeStateStoreLike,
  subscription: Nullable<Subscription>
): Nullable<Subscription> => {
  store.subscriptions.blockUpdates?.unsubscribe?.();
  store.subscriptions.blockUpdates = subscription ?? null;

  return store.subscriptions.blockUpdates;
};

/**
 * Writes the bridge transfer direction.
 */
export const syncDirectionCompat = (store: BridgeStateStoreLike, isSoraToEvm: boolean): boolean => {
  store.form.isSoraToEvm = isSoraToEvm;

  return store.form.isSoraToEvm;
};

/**
 * Writes the selected bridge asset address.
 */
export const syncAssetAddressValueCompat = (store: BridgeStateStoreLike, address?: Nullable<string>): string => {
  store.form.assetAddress = address ?? '';

  return store.form.assetAddress;
};

/**
 * Writes the active bridge amount input field.
 */
export const syncFocusedFieldCompat = (
  store: BridgeStateStoreLike,
  field: Nullable<BridgeFocusedField>
): Nullable<BridgeFocusedField> => {
  store.form.focusedField = field ?? null;

  return store.form.focusedField;
};

/**
 * Writes the user-entered sent amount.
 */
export const syncAmountSendCompat = (store: BridgeStateStoreLike, value?: Nullable<string>): string => {
  store.form.amountSend = value ?? '';

  return store.form.amountSend;
};

/**
 * Writes the calculated received amount.
 */
export const syncAmountReceivedCompat = (store: BridgeStateStoreLike, value?: Nullable<string>): string => {
  store.form.amountReceived = value ?? '';

  return store.form.amountReceived;
};

/**
 * Adds or removes an approval-pending transaction id.
 */
export const syncWaitingForApproveCompat = (
  store: BridgeStateStoreLike,
  id: string,
  pending: boolean
): Record<string, boolean> => {
  const nextWaitingForApprove = { ...store.history.waitingForApprove } as Record<string, boolean>;

  if (pending) {
    nextWaitingForApprove[id] = true;
  } else {
    delete nextWaitingForApprove[id];
  }

  store.history.waitingForApprove = nextWaitingForApprove;

  return nextWaitingForApprove;
};

/**
 * Adds or removes an in-progress transaction id.
 */
export const syncInProgressCompat = (
  store: BridgeStateStoreLike,
  id: string,
  pending: boolean
): Record<string, boolean> => {
  const nextInProgress = { ...store.history.inProgressIds } as Record<string, boolean>;

  if (pending) {
    nextInProgress[id] = true;
  } else {
    delete nextInProgress[id];
  }

  store.history.inProgressIds = nextInProgress;

  return nextInProgress;
};

/**
 * Writes the bridge notification transaction.
 */
export const syncNotificationCompat = (
  store: BridgeStateStoreLike,
  data: Nullable<IBridgeTransaction>
): Nullable<IBridgeTransaction> => {
  store.history.notificationData = data ?? null;

  return store.history.notificationData;
};

/**
 * Writes the bridge transaction signing dialog flag.
 */
export const syncSignDialogVisibilityCompat = (store: BridgeStateStoreLike, flag: boolean): boolean => {
  store.flags.isSignTxDialogVisible = flag;

  return store.flags.isSignTxDialogVisible;
};
