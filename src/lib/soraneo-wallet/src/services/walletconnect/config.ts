let walletConnectProjectId = '';

/**
 * Persists the WalletConnect project identifier without forcing the heavy
 * provider implementation into the initial application bundle.
 */
export const setWalletConnectProjectId = (projectId = ''): void => {
  walletConnectProjectId = projectId;
};

/**
 * Returns the WalletConnect project identifier configured for the current app.
 */
export const getWalletConnectProjectId = (): string => {
  return walletConnectProjectId;
};
