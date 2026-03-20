import { defineStore } from 'pinia';

import { withAppStore } from '@/utils/app-store';
import { trackEvent } from '@/utils/telemetry';

import {
  enterPiniaSync,
  enterLegacySync,
  isLegacySyncing,
  isPiniaSyncing,
  leaveLegacySync,
  leavePiniaSync,
} from './sync';

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

const warn = (message: string): void => {
  console.warn(`[bridge-history] ${message}`);
};

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

      const committed = withAppStore((store) => {
        const mutation = store?.commit?.bridge?.setHistoryPage;

        if (typeof mutation !== 'function') {
          warn('setHistoryPage mutation missing');
          return undefined;
        }

        enterPiniaSync();
        try {
          mutation(nextPage);
        } finally {
          leavePiniaSync();
        }

        return true;
      });

      if (!committed) {
        warn('unable to sync historyPage to legacy store');
      }
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

      const committed = withAppStore((store) => {
        const mutation = store?.commit?.bridge?.setHistoryId;

        if (typeof mutation !== 'function') {
          warn('setHistoryId mutation missing');
          return undefined;
        }

        enterPiniaSync();
        try {
          mutation(nextId);
        } finally {
          leavePiniaSync();
        }

        return true;
      });

      if (!committed) {
        warn('unable to sync historyId to legacy store');
      }
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
