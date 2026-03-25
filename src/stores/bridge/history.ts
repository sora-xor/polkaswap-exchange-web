import { defineStore } from 'pinia';

import { useBridgeStore } from '@/stores/bridge';
import { trackEvent } from '@/utils/telemetry';

import { enterLegacySync, isLegacySyncing, leaveLegacySync } from './sync';

type BridgeHistoryState = {
  historyPage: number;
  historyId: string;
};

const buildInitialState = (): BridgeHistoryState => ({
  historyPage: 1,
  historyId: '',
});

const normalizePage = (page?: number): number => {
  const parsed = Number(page);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.floor(parsed);
};

const normalizeId = (id?: string): string => (typeof id === 'string' ? id : '');

export const useBridgeHistoryStore = defineStore('bridgeHistory', {
  state: (): BridgeHistoryState => buildInitialState(),
  actions: {
    setHistoryPage(page?: number): void {
      const nextPage = normalizePage(page);
      this.historyPage = nextPage;
      trackEvent('bridge.pinia.historyPage.changed', { page: nextPage });

      if (isLegacySyncing()) {
        return;
      }

      useBridgeStore().setHistoryPage(nextPage);
    },
    resetHistoryPage(): void {
      this.setHistoryPage(1);
    },
    syncHistoryPageFromLegacy(page?: number): void {
      const nextPage = normalizePage(page);

      if (this.historyPage === nextPage) {
        return;
      }

      enterLegacySync();
      try {
        this.historyPage = nextPage;
      } finally {
        leaveLegacySync();
      }
    },
    setHistoryId(id?: string): void {
      const nextId = normalizeId(id);
      this.historyId = nextId;

      if (isLegacySyncing()) {
        return;
      }

      useBridgeStore().setHistoryId(nextId);
    },
    syncHistoryIdFromLegacy(id?: string): void {
      const nextId = normalizeId(id);

      if (this.historyId === nextId) {
        return;
      }

      enterLegacySync();
      try {
        this.historyId = nextId;
      } finally {
        leaveLegacySync();
      }
    },
  },
});
