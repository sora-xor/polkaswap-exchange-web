import type { WhitelistIdsBySymbol } from '@/lib/soraneo-wallet/src/types/common';
import type { Whitelist, WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';

export type WhitelistAssetsApi = {
  getWhitelist: (whitelist: WhitelistArrayItem[]) => Whitelist;
  getWhitelistIdsBySymbol: (whitelist: WhitelistArrayItem[]) => WhitelistIdsBySymbol;
};

/**
 * Converts the stored whitelist catalog into the SDK's address-indexed lookup
 * shape while keeping malformed or failed SDK adapters from breaking the store.
 */
export function resolveWhitelist(
  whitelistArray: ReadonlyArray<WhitelistArrayItem> = [],
  assetsApi: WhitelistAssetsApi
): Whitelist {
  if (!whitelistArray.length) {
    return {};
  }

  try {
    return assetsApi.getWhitelist([...whitelistArray]);
  } catch {
    return {};
  }
}

/**
 * Converts the stored whitelist catalog into the SDK's symbol-indexed lookup
 * shape while preserving the wallet store's empty-object default contract.
 */
export function resolveWhitelistIdsBySymbol(
  whitelistArray: ReadonlyArray<WhitelistArrayItem> = [],
  assetsApi: WhitelistAssetsApi
): WhitelistIdsBySymbol {
  if (!whitelistArray.length) {
    return {} as WhitelistIdsBySymbol;
  }

  try {
    return assetsApi.getWhitelistIdsBySymbol([...whitelistArray]);
  } catch {
    return {} as WhitelistIdsBySymbol;
  }
}
