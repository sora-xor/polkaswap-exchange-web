import { getActivePinia } from 'pinia';

import { useAssetsStore } from '@/stores/assets';
import type { AssetsState, BridgeRegisteredAsset } from '@/stores/assets/types';
import type { Nullable } from '@/types/common';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

type AssetLookup = (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>;
type LegacyAssetRootGetters = {
  assets?: {
    assetDataByAddress?: unknown;
  };
};
export type NativeBridgeTokenParams = {
  nativeSymbol?: Nullable<string>;
  registeredAssets: Record<string, BridgeRegisteredAsset>;
  walletAssets: ReadonlyArray<Partial<RegisteredAccountAsset>>;
  assetDataByAddress: AssetLookup;
};

const noopLookup: AssetLookup = () => null;

/**
 * Resolves the reactive asset lookup getter, supporting both explicit legacy
 * getter objects passed from compatibility code and the active Pinia assets
 * store once the app has fully booted.
 */
export function resolveAssetLookup(rootGetters: LegacyAssetRootGetters): AssetLookup {
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
    // Pinia is not ready yet.
  }

  return noopLookup;
}

type AssetsRegistrySource = Pick<AssetsState, 'registeredAssets'> | undefined;

/**
 * Returns the latest map of registered bridge assets, preferring the explicitly
 * provided source and falling back to the Pinia assets store when available.
 */
export function resolveRegisteredAssets(source?: AssetsRegistrySource): Record<string, BridgeRegisteredAsset> {
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
    // Pinia is not ready yet.
  }

  return {};
}

/**
 * Resolves a bridge network native token only from assets registered for the
 * selected bridge, preventing same-symbol spoofed wallet assets from matching.
 */
export function resolveNativeBridgeToken({
  nativeSymbol,
  registeredAssets,
  walletAssets,
  assetDataByAddress,
}: NativeBridgeTokenParams): Nullable<RegisteredAccountAsset> {
  if (!nativeSymbol) return null;

  const registeredWalletAsset = walletAssets.find(
    (asset) => asset.symbol === nativeSymbol && Boolean(asset.address && asset.address in registeredAssets)
  );

  if (registeredWalletAsset?.address) {
    return assetDataByAddress(registeredWalletAsset.address);
  }

  for (const address of Object.keys(registeredAssets)) {
    const asset = assetDataByAddress(address);
    if (asset?.symbol === nativeSymbol) return asset;
  }

  return null;
}
