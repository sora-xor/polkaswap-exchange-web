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
const safeRead = <K extends keyof WalletModule>(key: K): WalletModule[K] | undefined => {
  try {
    return moduleWithFallback[key];
  } catch {
    return undefined;
  }
};
const walletConsts = safeRead('WALLET_CONSTS');

const defaultIndexerType = {
  SUBQUERY: 'subquery',
  SUBSQUID: 'subsquid',
};

export let WALLET_CONSTS = {
  ...(walletConsts ?? {}),
  IndexerType: {
    ...defaultIndexerType,
    ...(walletConsts?.IndexerType ?? {}),
  },
};

export const en = safeRead('en') ?? {};
export const storage = safeRead('storage') ?? new Storage('wallet');
export const settingsStorage = safeRead('settingsStorage') ?? new Storage('settings');

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

export const getCurrentIndexer = safeRead('getCurrentIndexer') ?? createFallbackIndexer;

export * from '../lib/soraneo-wallet/src/index.ts';
