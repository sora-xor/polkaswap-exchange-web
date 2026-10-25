import { getWalletConnectProjectId as getConfiguredWalletConnectProjectId } from '@/lib/soraneo-wallet/src/services/walletconnect/config';

/**
 * Provides the WalletConnect project identifier owned by the vendored wallet
 * config module. The lookup stays async to preserve the public helper
 * contract used by existing EVM utilities.
 */
export const getWalletConnectProjectId = async (): Promise<string> => {
  const projectId = getConfiguredWalletConnectProjectId();

  if (!projectId) {
    throw new Error('WalletConnect projectId is not configured');
  }

  return projectId;
};

export const resetWalletConnectProjectIdCache = (): void => {
  // No-op: the project id now comes directly from the wallet config owner.
};
