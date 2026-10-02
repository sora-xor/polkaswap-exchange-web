import { KnownAssets, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { LiberlandAssetType, SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { defineStore } from 'pinia';

import { ZeroStringValue } from '@/consts';
import type { AssetsState, BridgeRegisteredAsset } from '@/stores/assets/types';
import { useBridgeStore } from '@/stores/bridge';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import ethersUtil from '@/utils/ethers-util';

import type { Asset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { SubNetwork, SubAssetId } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

const buildInitialState = (): AssetsState => ({
  registeredAssets: {},
  registeredAssetsFetching: false,
});

type RegisteredAssetsRequest = Readonly<{
  id: number;
  networkType: Nullable<BridgeNetworkType>;
  networkSelected: unknown;
}>;

const registeredAssetsRequests = new WeakMap<object, RegisteredAssetsRequest>();
let registeredAssetsRequestId = 0;

/** Captures the network selection that owns a registry refresh. */
const beginRegisteredAssetsRequest = (store: object): RegisteredAssetsRequest => {
  const web3Store = useWeb3Store();
  const request = Object.freeze({
    id: ++registeredAssetsRequestId,
    networkType: web3Store.networkType,
    networkSelected: web3Store.networkSelected,
  });

  registeredAssetsRequests.set(store, request);
  return request;
};

/** Prevents an older network response from replacing the active registry. */
const isLatestRegisteredAssetsRequest = (store: object, request: RegisteredAssetsRequest): boolean =>
  registeredAssetsRequests.get(store) === request;

/** Prevents a response for an abandoned network selection from being committed. */
const isCurrentRegisteredAssetsRequest = (store: object, request: RegisteredAssetsRequest): boolean => {
  const web3Store = useWeb3Store();

  return (
    isLatestRegisteredAssetsRequest(store, request) &&
    web3Store.networkType === request.networkType &&
    web3Store.networkSelected === request.networkSelected
  );
};

const convertRegisteredAssets = (
  entries: Record<string, BridgeRegisteredAsset>[]
): Record<string, BridgeRegisteredAsset> =>
  entries.reduce<Record<string, BridgeRegisteredAsset>>((buffer, asset) => ({ ...buffer, ...asset }), {});

const INTEGER_PATTERN = /^(0|[1-9]\d*)$/;
const MAX_LIBERLAND_ASSET_ID = 4_294_967_295;

/**
 * Normalizes a Liberland pallet-assets ID without coercing missing metadata to native LLD.
 */
const getLiberlandAssetIdAddress = (address: SubAssetId): string | null => {
  if (address === LiberlandAssetType.LLD) return '';
  if (!address || typeof address !== 'object' || Array.isArray(address)) return null;
  if (!Object.prototype.hasOwnProperty.call(address, LiberlandAssetType.Asset)) return null;

  const rawAssetId = (address as { [LiberlandAssetType.Asset]?: unknown })[LiberlandAssetType.Asset];
  let normalized = '';

  try {
    normalized = typeof rawAssetId === 'string' ? rawAssetId.trim() : String(rawAssetId);
  } catch {
    return null;
  }

  if (!INTEGER_PATTERN.test(normalized)) return null;

  const assetId = Number(normalized);
  if (!Number.isSafeInteger(assetId) || assetId > MAX_LIBERLAND_ASSET_ID) return null;

  return String(assetId);
};

/**
 * Converts a registered Substrate asset ID into the frontend address representation.
 */
const getSubAssetIdAddress = (address: SubAssetId, network: SubNetwork): string | null => {
  if (network === SubNetworkId.Liberland) {
    return getLiberlandAssetIdAddress(address);
  }

  return '';
};

const fetchEthRegisteredAssets = async (): Promise<Record<string, BridgeRegisteredAsset>[]> => {
  if (!ethBridgeApi?.getRegisteredAssets) return [];

  const networkAssets = await ethBridgeApi.getRegisteredAssets();

  return Object.entries(networkAssets).map(([soraAddress, assetData]) => ({
    [soraAddress]: {
      address: assetData.address,
      decimals: assetData.decimals ?? 18,
      kind: assetData.assetKind,
    },
  }));
};

const fetchEvmRegisteredAssets = async (
  network: Nullable<EvmNetwork>
): Promise<Record<string, BridgeRegisteredAsset>[]> => {
  if (!network) return [];
  if (!evmBridgeApi?.getRegisteredAssets) return [];

  const networkAssets = await evmBridgeApi.getRegisteredAssets(network);

  return Object.entries(networkAssets).map(([soraAddress, assetData]) => ({
    [soraAddress]: {
      address: assetData.address,
      decimals: assetData.decimals,
      kind: assetData.appKind,
    },
  }));
};

const fetchSubRegisteredAssets = async (
  network: Nullable<SubNetwork>
): Promise<Record<string, BridgeRegisteredAsset>[]> => {
  if (!network) return [];
  if (!subBridgeApi?.getRegisteredAssets) return [];

  const networkAssets = await subBridgeApi.getRegisteredAssets(network);

  return Object.entries(networkAssets).flatMap(([soraAddress, assetData]) => {
    const address = getSubAssetIdAddress(assetData.address, network);

    // A missing Liberland ID is not native LLD; omit the unsafe registry entry.
    if (address === null) return [];

    return [
      {
        [soraAddress]: {
          address,
          decimals: assetData.decimals,
          kind: assetData.assetKind,
        },
      },
    ];
  });
};

const updateEthAssetsData = async (
  assets: Record<string, BridgeRegisteredAsset>
): Promise<Record<string, BridgeRegisteredAsset>> => {
  const web3Store = useWeb3Store();
  const { isValidNetwork } = web3Store;

  if (!isValidNetwork) return assets;

  const updatedEntries = await Promise.all(
    Object.entries(assets).map(async ([soraAddress, assetData]) => {
      const asset = { ...assetData };

      if (!asset.address) {
        asset.address = await web3Store.getEvmTokenAddressByAssetId(soraAddress);
        if (!asset.address) return [soraAddress, asset] as const;

        asset.decimals = await ethersUtil.getTokenDecimals(asset.address);
      }

      return [soraAddress, asset] as const;
    })
  );

  return Object.fromEntries(updatedEntries);
};

const updateSubAssetsData = async (
  assets: Record<string, BridgeRegisteredAsset>,
  network: Nullable<SubNetwork>
): Promise<Record<string, BridgeRegisteredAsset>> => {
  const bridgeStore = useBridgeStore();
  const { destinationNetwork, soraParachain, parachain } = bridgeStore.subBridgeConnector;

  const hasParachainApi =
    Boolean(subBridgeApi?.soraParachainApi?.getAssetMulilocation) &&
    typeof parachain?.getAssetIdByMultilocation === 'function';

  if (
    !subBridgeApi?.isParachain?.(destinationNetwork) ||
    !(soraParachain && parachain) ||
    !network ||
    !hasParachainApi
  ) {
    return assets;
  }

  await Promise.all([soraParachain.connect(), parachain.connect()]);

  const updatedEntries = await Promise.all(
    Object.entries(assets).map(async ([soraAddress, assetData]) => {
      const asset = { ...assetData };
      const walletStore = useWalletStore();
      const soraAsset = walletStore.assetsDataTable?.[soraAddress];
      if (!asset.address && soraAsset) {
        const multilocation = await subBridgeApi.soraParachainApi.getAssetMulilocation(soraAddress, soraParachain.api);
        const id = await parachain.getAssetIdByMultilocation(soraAsset, multilocation);
        asset.address = id;
      }
      return [soraAddress, asset] as const;
    })
  );

  return Object.fromEntries(updatedEntries);
};

/** Enriches a registry using only the network selection captured by its request. */
const updateAssetsData = async (
  assets: Record<string, BridgeRegisteredAsset>,
  request: RegisteredAssetsRequest
): Promise<Record<string, BridgeRegisteredAsset>> => {
  if (request.networkType === BridgeNetworkType.Sub) {
    return await updateSubAssetsData(assets, request.networkSelected as Nullable<SubNetwork>);
  }

  return await updateEthAssetsData(assets);
};

export const useAssetsStore = defineStore('assets', {
  state: (): AssetsState => buildInitialState(),
  getters: {
    whitelistAssets(): Array<Asset> {
      const walletStore = useWalletStore();
      const assets = walletStore.assets as Array<Asset>;
      const whitelist = walletStore.whitelist as unknown;

      if (Array.isArray(whitelist)) {
        return assets.filter((asset) => whitelist.includes(asset.address));
      }

      if (whitelist && typeof whitelist === 'object') {
        return assets.filter((asset) =>
          Object.prototype.hasOwnProperty.call(whitelist as Record<string, unknown>, asset.address)
        );
      }

      return [];
    },
    assetDataByAddress: (state) => {
      return (address?: Nullable<string>): Nullable<RegisteredAccountAsset> => {
        if (!address) return undefined;

        const walletStore = useWalletStore();
        const accountAsset = walletStore.accountAssetsAddressTable?.[address] as Nullable<RegisteredAccountAsset>;
        const asset =
          walletStore.assetsDataTable?.[address] ??
          (walletStore.assets?.find((item) => item.address === address) as Nullable<Asset>) ??
          accountAsset ??
          (KnownAssets.get(address) as Nullable<Asset>);

        if (!asset) return null;

        const registered = state.registeredAssets?.[asset.address] || {};
        const { balance } = accountAsset || {};

        return {
          ...asset,
          balance,
          externalAddress: registered.address,
          externalBalance: ZeroStringValue,
          externalDecimals: registered.decimals,
        };
      };
    },
    xor(): Nullable<RegisteredAccountAsset> {
      return this.assetDataByAddress(XOR.address);
    },
  },
  actions: {
    setRegisteredAssetsFetching(value: boolean): void {
      this.registeredAssetsFetching = value;
    },
    setRegisteredAssets(assets: Record<string, BridgeRegisteredAsset> = {}): void {
      this.registeredAssets = Object.freeze({ ...assets });
    },
    reset(): void {
      registeredAssetsRequests.delete(this);
      this.$patch(buildInitialState());
    },
    async getRegisteredAssets(): Promise<void> {
      const request = beginRegisteredAssetsRequest(this);
      this.setRegisteredAssetsFetching(true);

      try {
        const registeredAssets = await this.fetchRegisteredAssetsFromNetwork();
        if (!isCurrentRegisteredAssetsRequest(this, request)) return;

        const assets = convertRegisteredAssets(registeredAssets);
        const updated = await updateAssetsData(assets, request);

        if (isCurrentRegisteredAssetsRequest(this, request)) {
          this.setRegisteredAssets(updated);
        }
      } catch (error) {
        // Network APIs may be unavailable during boot (or in E2E stubs).
        // Fall back silently to an empty registry so the UI can still render.
        if (isCurrentRegisteredAssetsRequest(this, request)) {
          this.setRegisteredAssets();
        }
      } finally {
        if (isLatestRegisteredAssetsRequest(this, request)) {
          this.setRegisteredAssetsFetching(false);
        }
      }
    },
    async fetchRegisteredAssetsFromNetwork(): Promise<Record<string, BridgeRegisteredAsset>[]> {
      const web3Store = useWeb3Store();
      switch (web3Store.networkType) {
        case BridgeNetworkType.Eth:
          return await fetchEthRegisteredAssets();
        case BridgeNetworkType.Evm:
          return await fetchEvmRegisteredAssets(web3Store.networkSelected as Nullable<EvmNetwork>);
        case BridgeNetworkType.Sub:
          return await fetchSubRegisteredAssets(web3Store.networkSelected as Nullable<SubNetwork>);
        default:
          return [];
      }
    },
    async updateRegisteredAssets(): Promise<void> {
      const request = beginRegisteredAssetsRequest(this);
      this.setRegisteredAssetsFetching(true);

      try {
        const assets = this.registeredAssets;
        const updated = await updateAssetsData(assets, request);

        if (isCurrentRegisteredAssetsRequest(this, request)) {
          this.setRegisteredAssets(updated);
        }
      } finally {
        if (isLatestRegisteredAssetsRequest(this, request)) {
          this.setRegisteredAssetsFetching(false);
        }
      }
    },
  },
});
