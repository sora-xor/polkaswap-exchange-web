import type { Nullable } from '@/types/common';
import { loadWalletCore } from '@/utils/walletCore';

let projectIdPromise: Promise<string> | null = null;

const resolveProjectId = async (): Promise<string> => {
  if (!projectIdPromise) {
    projectIdPromise = loadWalletCore().then(({ WC }) => {
      const projectId = (WC as Nullable<{ WcProvider?: { projectId?: string } }>)?.WcProvider?.projectId;

      if (!projectId) {
        throw new Error('WalletConnect projectId is not configured');
      }

      return projectId;
    });
  }

  return projectIdPromise;
};

/**
 * Provides WalletConnect project identifier configured by the Soraneo wallet SDK.
 *
 * The value is resolved lazily to avoid static circular dependencies during bundle execution
 * (notably on IPFS builds) and cached after the first lookup.
 */
export const getWalletConnectProjectId = async (): Promise<string> => {
  return resolveProjectId();
};

export const resetWalletConnectProjectIdCache = (): void => {
  projectIdPromise = null;
};
