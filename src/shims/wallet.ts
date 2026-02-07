import * as actual from '../lib/soraneo-wallet/src/index.ts';
import { Storage } from '@sora-substrate/sdk';

type WalletModule = typeof actual & {
  en?: Record<string, unknown>;
  storage?: Storage;
  settingsStorage?: Storage;
  WALLET_CONSTS?: {
    IndexerType?: {
      SUBQUERY: string;
      SUBSQUID: string;
      [key: string]: string;
    };
    [key: string]: unknown;
  };
  getCurrentIndexer?: () => unknown;
};

const moduleWithFallback = actual as WalletModule;

const defaultIndexerType = {
  SUBQUERY: 'subquery',
  SUBSQUID: 'subsquid',
};

export let WALLET_CONSTS = {
  ...(moduleWithFallback.WALLET_CONSTS ?? {}),
  IndexerType: {
    ...defaultIndexerType,
    ...(moduleWithFallback.WALLET_CONSTS?.IndexerType ?? {}),
  },
};

export const en = moduleWithFallback.en ?? {};
export const storage = moduleWithFallback.storage ?? new Storage('wallet');
export const settingsStorage = moduleWithFallback.settingsStorage ?? new Storage('settings');

const createFallbackIndexer = () => ({
  type: WALLET_CONSTS.IndexerType.SUBQUERY,
  services: {
    explorer: {
      request: async () => null,
      fetchEntities: async () => ({ totalCount: 0 }),
      fetchEntitiesConnection: async () => ({ totalCount: 0 }),
      createEntitySubscription: () => () => undefined,
    },
  },
});

export const getCurrentIndexer = moduleWithFallback.getCurrentIndexer ?? createFallbackIndexer;

export * from '../lib/soraneo-wallet/src/index.ts';
