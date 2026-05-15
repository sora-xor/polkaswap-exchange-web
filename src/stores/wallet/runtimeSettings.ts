export type WalletApiKeys = Record<string, string>;

export type GoogleDriveOptions = {
  googleApi: string;
  googleClientId: string;
};

export type NftStorageCredentials = {
  marketplaceDid?: string;
  ucan?: string;
};

export type WalletNftStorageOptions = {
  token?: string;
  did?: string;
};

/**
 * Merges runtime API keys into the existing wallet settings object.
 */
export function mergeWalletApiKeys(current: WalletApiKeys = {}, next: WalletApiKeys = {}): WalletApiKeys {
  return {
    ...current,
    ...next,
  };
}

/**
 * Resolves Google Drive backup configuration only when both required keys exist.
 */
export function resolveGoogleDriveOptions(apiKeys: WalletApiKeys): GoogleDriveOptions | null {
  const { googleApi, googleClientId } = apiKeys;

  return googleApi && googleClientId ? { googleApi, googleClientId } : null;
}

/**
 * Resolves the WalletConnect project id from runtime API keys.
 */
export function resolveWalletConnectProjectId(apiKeys: WalletApiKeys): string | null {
  return apiKeys.walletconnect || null;
}

/**
 * Builds NFT.Storage options from marketplace UCAN credentials or fallback API keys.
 */
export function resolveNftStorageOptions(
  apiKeys: WalletApiKeys,
  credentials: NftStorageCredentials = {}
): WalletNftStorageOptions {
  if (credentials.marketplaceDid && credentials.ucan) {
    return {
      token: credentials.ucan,
      did: credentials.marketplaceDid,
    };
  }

  return {
    token: apiKeys.nftStorage,
  };
}
