import { defineStore } from 'pinia';

import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

import type { Nullable } from '@/types/common';
import { trackEvent } from '@/utils/telemetry';

import { enterLegacySync, leaveLegacySync } from './sync';

type FlagRecord = Record<string, boolean>;

type BridgeTransactionsState = {
  historyInternal: Record<string, IBridgeTransaction>;
  historyLoading: FlagRecord;
  waitingForApprove: FlagRecord;
  inProgressIds: FlagRecord;
  notificationData: Nullable<IBridgeTransaction>;
  isSignTxDialogVisible: boolean;
};

const buildInitialState = (): BridgeTransactionsState => ({
  historyInternal: Object.freeze({}),
  historyLoading: {},
  waitingForApprove: {},
  inProgressIds: {},
  notificationData: null,
  isSignTxDialogVisible: false,
});

const cloneRecord = <T>(record: Record<string, T> = {}): Record<string, T> => ({ ...record });
const freezeHistory = (history: Record<string, IBridgeTransaction>) => Object.freeze({ ...history });

export const useBridgeTransactionsStore = defineStore('bridgeTransactions', {
  state: (): BridgeTransactionsState => buildInitialState(),
  actions: {
    syncHistoryInternalFromLegacy(history: Record<string, IBridgeTransaction> = {}): void {
      enterLegacySync();
      try {
        this.historyInternal = freezeHistory(history);
      } finally {
        leaveLegacySync();
      }
    },
    syncHistoryLoadingFromLegacy(loading: FlagRecord = {}): void {
      enterLegacySync();
      try {
        this.historyLoading = cloneRecord(loading);
      } finally {
        leaveLegacySync();
      }
    },
    syncWaitingForApproveFromLegacy(records: FlagRecord = {}): void {
      enterLegacySync();
      try {
        this.waitingForApprove = cloneRecord(records);
      } finally {
        leaveLegacySync();
      }
    },
    syncInProgressIdsFromLegacy(records: FlagRecord = {}): void {
      enterLegacySync();
      try {
        this.inProgressIds = cloneRecord(records);
      } finally {
        leaveLegacySync();
      }
    },
    syncNotificationDataFromLegacy(tx: Nullable<IBridgeTransaction>): void {
      enterLegacySync();
      try {
        this.notificationData = tx ?? null;
      } finally {
        leaveLegacySync();
      }
    },
    setNotificationData(tx?: Nullable<IBridgeTransaction>): void {
      this.notificationData = tx ?? null;
    },
    syncSignDialogVisibilityFromLegacy(visible: boolean): void {
      enterLegacySync();
      try {
        this.isSignTxDialogVisible = visible;
      } finally {
        leaveLegacySync();
      }
    },
    syncNetworkHistoryToggle(networkId: BridgeNetworkId, loading: boolean): void {
      enterLegacySync();
      try {
        this.historyLoading = {
          ...this.historyLoading,
          [networkId]: loading,
        };
      } finally {
        leaveLegacySync();
      }
    },
    trackTransferSubmitted(payload: {
      direction: 'soraToExternal' | 'externalToSora';
      asset?: Nullable<string>;
      amount?: Nullable<string>;
      network?: Nullable<string>;
    }): void {
      trackEvent('bridge.pinia.transfer.submitted', {
        ...payload,
        buildVariant:
          typeof window !== 'undefined' && typeof (window as Record<string, unknown>).__PS_BUILD_VARIANT__ === 'string'
            ? (window as Record<string, unknown>).__PS_BUILD_VARIANT__
            : 'unknown',
      });
    },
  },
});
