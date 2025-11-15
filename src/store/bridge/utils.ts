import { getActivePinia } from 'pinia';

import { useAssetsStore } from '@/stores/assets';
import type { AssetsState, BridgeRegisteredAsset } from '@/stores/assets/types';
import type { Nullable } from '@/types/common';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

type AssetLookup = (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>;

const noopLookup: AssetLookup = () => null;

/**
 * Resolves the reactive asset lookup getter, supporting both the legacy Vuex module
 * (`rootGetters.assets.assetDataByAddress`) and the transitional Pinia store.
 *
 * The IPFS bundle executes in stricter environments where the Vuex getter can be
 * unavailable (e.g. when the wallet module is not fully initialised yet). To avoid
 * hard crashes we attempt to fall back to the Pinia assets store when possible.
 */
export function resolveAssetLookup(rootGetters: Record<string, any>): AssetLookup {
  const legacyGetter = rootGetters?.assets?.assetDataByAddress;

  if (typeof legacyGetter === 'function') {
    return legacyGetter as AssetLookup;
  }

  try {
    if (getActivePinia()) {
      const assetsStore = useAssetsStore();
      const piniaGetter = assetsStore?.assetDataByAddress;

      if (typeof piniaGetter === 'function') {
        return piniaGetter as AssetLookup;
      }
    }
  } catch {
    // Pinia is not ready yet – fall back to a noop lookup.
  }

  return noopLookup;
}

type LegacyAssetsState = Pick<AssetsState, 'registeredAssets'> | undefined;

/**
 * Returns the latest map of registered bridge assets.
 * Falls back to the Pinia assets store when the legacy Vuex module is not hydrated yet.
 */
export function resolveRegisteredAssets(source?: LegacyAssetsState): Record<string, BridgeRegisteredAsset> {
  const legacy = source?.registeredAssets;

  if (legacy && Object.keys(legacy).length) {
    return legacy;
  }

  try {
    if (getActivePinia()) {
      const assetsStore = useAssetsStore();
      return assetsStore?.registeredAssets ?? {};
    }
  } catch {
    // Pinia is not ready yet – return an empty registry.
  }

  return {};
}
