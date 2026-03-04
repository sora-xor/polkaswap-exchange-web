import { KnownAssets, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { defineStore } from 'pinia';

import { ZeroStringValue } from '@/consts';
import type { AssetsState, BridgeRegisteredAsset } from '@/stores/assets/types';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import ethersUtil from '@/utils/ethers-util';
import { requireLegacyStore } from '@/utils/legacy-store';

import type { Asset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { SubNetwork, SubAssetId } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

const buildInitialState = (): AssetsState => ({
  registeredAssets: {},
  registeredAssetsFetching: false,
});

const convertRegisteredAssets = (
  entries: Record<string, BridgeRegisteredAsset>[]
): Record<string, BridgeRegisteredAsset> =>
  entries.reduce<Record<string, BridgeRegisteredAsset>>((buffer, asset) => ({ ...buffer, ...asset }), {});

const getSubAssetIdAddress = (address: SubAssetId, network: SubNetwork): string => {
  if (network === SubNetworkId.Liberland) {
    const id = typeof address === 'object' ? address?.Asset?.toString() : '';

    return id ?? '';
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

  return Object.entries(networkAssets).map(([soraAddress, assetData]) => ({
    [soraAddress]: {
      address: getSubAssetIdAddress(assetData.address, network),
      decimals: assetData.decimals,
      kind: assetData.assetKind,
    },
  }));
};

const updateEthAssetsData = async (
  assets: Record<string, BridgeRegisteredAsset>
): Promise<Record<string, BridgeRegisteredAsset>> => {
  const store = requireLegacyStore();
  const { isValidNetwork } = store.getters.web3;

  if (!isValidNetwork) return assets;

  const updatedEntries = await Promise.all(
    Object.entries(assets).map(async ([soraAddress, assetData]) => {
      const asset = { ...assetData };

      if (!asset.address) {
        asset.address = await store.dispatch.web3.getEvmTokenAddressByAssetId(soraAddress);
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
  const store = requireLegacyStore();
  const { destinationNetwork, soraParachain, parachain } = store.state.bridge.subBridgeConnector;

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
        const asset =
          walletStore.assetsDataTable?.[address] ??
          (walletStore.assets?.find((item) => item.address === address) as Nullable<Asset>) ??
          (KnownAssets.get(address) as Nullable<Asset>);

        if (!asset) return null;

        const registered = state.registeredAssets?.[asset.address] || {};
        const { balance } = walletStore.accountAssetsAddressTable?.[asset.address] || {};

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
      this.$patch(buildInitialState());
    },
    async getRegisteredAssets(): Promise<void> {
      this.setRegisteredAssetsFetching(true);

      try {
        const registeredAssets = await this.fetchRegisteredAssetsFromNetwork();
        this.setRegisteredAssets(convertRegisteredAssets(registeredAssets));
        await this.updateRegisteredAssets();
      } catch (error) {
        // Network APIs may be unavailable during boot (or in E2E stubs).
        // Fall back silently to an empty registry so the UI can still render.
        this.setRegisteredAssets();
      } finally {
        this.setRegisteredAssetsFetching(false);
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
      this.setRegisteredAssetsFetching(true);

      try {
        const web3Store = useWeb3Store();
        const assets = this.registeredAssets;
        let updated = assets;

        if (web3Store.networkType === BridgeNetworkType.Sub) {
          updated = await updateSubAssetsData(assets, web3Store.networkSelected as Nullable<SubNetwork>);
        } else {
          updated = await updateEthAssetsData(assets);
        }

        this.setRegisteredAssets(updated);
      } finally {
        this.setRegisteredAssetsFetching(false);
      }
    },
  },
});
