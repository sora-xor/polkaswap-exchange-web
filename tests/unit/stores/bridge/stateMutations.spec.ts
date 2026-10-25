import { FPNumber, Operation } from '@sora-substrate/sdk';
import { describe, expect, it, vi } from 'vitest';

import { ZeroStringValue } from '@/consts';
import { buildInitialBridgeState } from '@/stores/bridge/state';
import {
  syncAmountReceivedCompat,
  syncAmountSendCompat,
  syncAssetAddressValueCompat,
  syncAssetLockedBalanceCompat,
  syncBalancesBatchCompat,
  syncBalancesFetchingCompat,
  syncBlockUpdatesSubscriptionCompat,
  syncDirectionCompat,
  syncExternalBlockNumberCompat,
  syncExternalMinBalanceCompat,
  syncExternalNetworkFeeCompat,
  syncExternalTransferFeeCompat,
  syncFeesAndLockedFundsFetchingCompat,
  syncFocusedFieldCompat,
  syncHistoryIdCompat,
  syncHistoryLoadingCompat,
  syncHistoryPageCompat,
  syncInProgressCompat,
  syncIncomingMinLimitCompat,
  syncInternalHistoryCompat,
  syncNotificationCompat,
  syncOutgoingMaxLimitCompat,
  syncOutgoingMaxLimitSubscriptionCompat,
  syncOutgoingMinLimitCompat,
  syncSignDialogVisibilityCompat,
  syncSoraNetworkFeeCompat,
  syncWaitingForApproveCompat,
  type BridgeStateStoreLike,
} from '@/stores/bridge/stateMutations';
import { BridgeFocusedField } from '@/stores/bridge/types';

import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { Subscription } from 'rxjs';

const createStore = (): BridgeStateStoreLike => buildInitialBridgeState();

const tx = (data: Partial<IBridgeTransaction>): IBridgeTransaction =>
  ({
    id: 'tx-id',
    type: Operation.EthBridgeOutgoing,
    ...data,
  }) as IBridgeTransaction;

const subscription = () =>
  ({
    unsubscribe: vi.fn(),
  }) as unknown as Subscription;

describe('bridge state mutation helpers', () => {
  it('syncs history identity, page, loading, and pinned internal history', () => {
    const store = createStore();
    const active = tx({ id: 'active-id', hash: 'active-hash' });
    const refreshed = {
      refreshedStorage: tx({ id: 'refreshed-id' }),
    };

    store.history.internal = {
      activeStorage: active,
    };
    syncHistoryIdCompat(store, 'active-hash');

    expect(syncHistoryPageCompat(store, 2.9)).toBe(2);
    expect(syncHistoryLoadingCompat(store, 'network-a', true)).toEqual({ 'network-a': true });
    expect(syncHistoryLoadingCompat(store, 'network-a', false)).toEqual({});

    const nextHistory = syncInternalHistoryCompat(store, refreshed);

    expect(Object.isFrozen(nextHistory)).toBe(true);
    expect(store.history.page).toBe(2);
    expect(store.history.id).toBe('active-hash');
    expect(store.history.internal).toEqual({
      ...refreshed,
      activeStorage: active,
    });
  });

  it('syncs balance, fee, and loading state with safe defaults', () => {
    const store = createStore();
    const lockedBalance = FPNumber.fromNatural(7);
    const incomingMin = FPNumber.fromNatural(1);
    const outgoingMin = FPNumber.fromNatural(2);
    const outgoingMax = FPNumber.fromNatural(3);

    expect(syncBalancesFetchingCompat(store, true)).toBe(true);
    expect(syncFeesAndLockedFundsFetchingCompat(store, true)).toBe(true);
    syncBalancesBatchCompat(store, {
      sender: '11',
      recipient: null,
      native: '22',
    });

    expect(syncExternalBlockNumberCompat(store, Number.NaN)).toBe(0);
    expect(syncExternalBlockNumberCompat(store, 123)).toBe(123);
    expect(syncAssetLockedBalanceCompat(store, lockedBalance)).toBe(lockedBalance);
    expect(syncSoraNetworkFeeCompat(store, '4')).toBe('4');
    expect(syncSoraNetworkFeeCompat(store, null)).toBe(ZeroStringValue);
    expect(syncExternalTransferFeeCompat(store, '5')).toBe('5');
    expect(syncExternalTransferFeeCompat(store, undefined)).toBe(ZeroStringValue);
    expect(syncExternalNetworkFeeCompat(store, '6')).toBe('6');
    expect(syncExternalNetworkFeeCompat(store, null)).toBe(ZeroStringValue);
    expect(syncExternalMinBalanceCompat(store, '7')).toBe('7');
    expect(syncExternalMinBalanceCompat(store, null)).toBe(ZeroStringValue);
    expect(syncIncomingMinLimitCompat(store, incomingMin)).toBe(incomingMin);
    expect(syncOutgoingMinLimitCompat(store, outgoingMin)).toBe(outgoingMin);
    expect(syncOutgoingMaxLimitCompat(store, outgoingMax)).toBe(outgoingMax);

    expect(store.balances.assetSenderBalance).toBe('11');
    expect(store.balances.assetRecipientBalance).toBeNull();
    expect(store.fees.externalNativeBalance).toBe('22');
  });

  it('replaces subscriptions and clears stale outgoing max limits', () => {
    const store = createStore();
    const firstMaxLimitSubscription = subscription();
    const nextMaxLimitSubscription = subscription();
    const firstBlockSubscription = subscription();
    const nextBlockSubscription = subscription();

    store.balances.outgoingMaxLimit = FPNumber.fromNatural(10);

    expect(syncOutgoingMaxLimitSubscriptionCompat(store, firstMaxLimitSubscription)).toBe(firstMaxLimitSubscription);
    expect(syncOutgoingMaxLimitSubscriptionCompat(store, nextMaxLimitSubscription)).toBe(nextMaxLimitSubscription);
    expect(firstMaxLimitSubscription.unsubscribe).toHaveBeenCalledOnce();
    expect(syncOutgoingMaxLimitSubscriptionCompat(store, null)).toBeNull();
    expect(nextMaxLimitSubscription.unsubscribe).toHaveBeenCalledOnce();
    expect(store.balances.outgoingMaxLimit).toBeNull();

    expect(syncBlockUpdatesSubscriptionCompat(store, firstBlockSubscription)).toBe(firstBlockSubscription);
    expect(syncBlockUpdatesSubscriptionCompat(store, nextBlockSubscription)).toBe(nextBlockSubscription);
    expect(firstBlockSubscription.unsubscribe).toHaveBeenCalledOnce();
  });

  it('syncs form fields and transaction status maps immutably', () => {
    const store = createStore();
    const notification = tx({ id: 'notification-id' });

    expect(syncDirectionCompat(store, false)).toBe(false);
    expect(syncAssetAddressValueCompat(store, 'asset-address')).toBe('asset-address');
    expect(syncAssetAddressValueCompat(store)).toBe('');
    expect(syncFocusedFieldCompat(store, BridgeFocusedField.Received)).toBe(BridgeFocusedField.Received);
    expect(syncFocusedFieldCompat(store, null)).toBeNull();
    expect(syncAmountSendCompat(store, '1')).toBe('1');
    expect(syncAmountSendCompat(store, null)).toBe('');
    expect(syncAmountReceivedCompat(store, '2')).toBe('2');
    expect(syncAmountReceivedCompat(store, undefined)).toBe('');
    expect(syncWaitingForApproveCompat(store, 'approve-id', true)).toEqual({ 'approve-id': true });
    expect(syncWaitingForApproveCompat(store, 'approve-id', false)).toEqual({});
    expect(syncInProgressCompat(store, 'progress-id', true)).toEqual({ 'progress-id': true });
    expect(syncInProgressCompat(store, 'progress-id', false)).toEqual({});
    expect(syncNotificationCompat(store, notification)).toBe(notification);
    expect(syncNotificationCompat(store, null)).toBeNull();
    expect(syncSignDialogVisibilityCompat(store, true)).toBe(true);
  });
});
