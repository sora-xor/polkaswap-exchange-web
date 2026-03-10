import type { AccountAsset, Asset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

export type SelectableAsset = Asset | AccountAsset | RegisteredAccountAsset;

/**
 * Guards token selection payloads so click events or malformed values
 * cannot be treated as assets.
 */
export const isSelectableAsset = (value: unknown): value is SelectableAsset => {
  if (!value || typeof value !== 'object') return false;

  const address = (value as { address?: unknown }).address;

  return typeof address === 'string' && address.length > 0;
};
