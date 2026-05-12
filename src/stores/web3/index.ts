import { FPNumber } from '@sora-substrate/math';
import { defineStore, type Pinia } from 'pinia';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import type { AppWallet } from '@/consts';
import { api as soraApi } from '@/lib/soraneo-wallet/src/api';
import * as accountUtils from '@/lib/soraneo-wallet/src/util/account';
import { EVM_NETWORKS, KnownEthBridgeAsset, SmartContracts, SmartContractType } from '@/consts/evm';
import { SUB_NETWORKS } from '@/consts/sub';
import { useWalletStore } from '@/stores/wallet';
import web3Mutations from '@/stores/web3/mutations';
import { initialState as createInitialWeb3State } from '@/stores/web3/state';
import type { PolkadotJsAccount } from '@/lib/soraneo-wallet/src/types/common';
import type { AvailableNetwork, EthBridgeSettings, SubNetworkApps, Web3State } from '@/stores/web3/types';
import type { Nullable } from '@/types/common';
import type { NetworkData } from '@/types/bridge';
import type { AppEIPProvider } from '@/types/evm/provider';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import {
  FearlessWalletProvider,
  MetamaskProvider,
  WalletConnectProvider,
  getProvidersList,
} from '@/utils/connection/evm/providers';

import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

type ExternalNetworkSelection = {
  id: BridgeNetworkId | SubNetwork;
  type: BridgeNetworkType;
};
type EthersUtilModule = typeof import('@/utils/ethers-util');
type SubNetworksConnectorModule = typeof import('@/utils/bridge/sub/classes/adapter');

export type {
  AvailableNetwork,
  EthBridgeContractsAddresses,
  EthBridgeSettings,
  SubNetworkApps,
} from '@/stores/web3/types';

const cloneWeb3State = (incoming?: Partial<Web3State> | null): Web3State => {
  const base = createInitialWeb3State();
  const state = incoming ?? {};

  return {
    ...base,
    ...state,
    evmProviders: Array.isArray(state.evmProviders) ? [...state.evmProviders] : [...base.evmProviders],
    evmNetworkApps: Array.isArray(state.evmNetworkApps) ? [...state.evmNetworkApps] : [...base.evmNetworkApps],
    subNetworkApps: state.subNetworkApps && typeof state.subNetworkApps === 'object' ? { ...state.subNetworkApps } : {},
    supportedApps: {
      [BridgeNetworkType.Eth]: {
        ...(base.supportedApps?.[BridgeNetworkType.Eth] ?? {}),
        ...(state.supportedApps?.[BridgeNetworkType.Eth] ?? {}),
      },
      [BridgeNetworkType.Evm]: {
        ...(base.supportedApps?.[BridgeNetworkType.Evm] ?? {}),
        ...(state.supportedApps?.[BridgeNetworkType.Evm] ?? {}),
      },
      [BridgeNetworkType.Sub]: Array.isArray(state.supportedApps?.[BridgeNetworkType.Sub])
        ? [...state.supportedApps[BridgeNetworkType.Sub]]
        : [...(base.supportedApps?.[BridgeNetworkType.Sub] ?? [])],
    },
    ethBridgeContractAddress: {
      ...base.ethBridgeContractAddress,
      ...(state.ethBridgeContractAddress ?? {}),
    },
  };
};

const buildAvailableNetworks = (
  state: Web3State
): Record<BridgeNetworkType, Partial<Record<BridgeNetworkId, AvailableNetwork>>> => {
  const hashi = [state.ethBridgeEvmNetwork].reduce<Partial<Record<BridgeNetworkId, AvailableNetwork>>>((buffer, id) => {
    const data = EVM_NETWORKS[id];

    if (data) {
      buffer[id] = {
        disabled: false,
        data,
      };
    }

    return buffer;
  }, {});

  const evm = state.evmNetworkApps.reduce<Partial<Record<BridgeNetworkId, AvailableNetwork>>>((buffer, id) => {
    const data = EVM_NETWORKS[id];

    if (data) {
      buffer[id] = {
        disabled: !state.supportedApps?.[BridgeNetworkType.Evm]?.[id],
        data,
      };
    }

    return buffer;
  }, {});

  const sub = Object.entries(state.subNetworkApps).reduce<Partial<Record<BridgeNetworkId, AvailableNetwork>>>(
    (buffer, [id, nodesOrFlag]) => {
      const data = SUB_NETWORKS[id];

      if (data) {
        const disabled = !(nodesOrFlag && state.supportedApps?.[BridgeNetworkType.Sub]?.includes(id as SubNetwork));

        buffer[id as BridgeNetworkId] = {
          disabled,
          data: Array.isArray(nodesOrFlag) ? { ...data, nodes: nodesOrFlag } : data,
        };
      }

      return buffer;
    },
    {}
  );

  return {
    [BridgeNetworkType.Eth]: hashi,
    [BridgeNetworkType.Evm]: evm,
    [BridgeNetworkType.Sub]: sub,
  };
};

const buildSelectedNetwork = (
  state: Web3State,
  availableNetworks: Record<BridgeNetworkType, Partial<Record<BridgeNetworkId, AvailableNetwork>>>
): Nullable<NetworkData> => {
  const { networkSelected, networkType } = state;

  if (!(networkType && networkSelected != null)) {
    return null;
  }

  const networks = availableNetworks[networkType];

  if (!networks) {
    return null;
  }

  return networks[networkSelected]?.data ?? null;
};

const getAssetsStore = async (pinia: Pinia): Promise<ReturnType<typeof import('@/stores/assets').useAssetsStore>> => {
  const { useAssetsStore } = await import('@/stores/assets');
  return useAssetsStore(pinia);
};

const getBridgeStore = async (pinia: Pinia): Promise<ReturnType<typeof import('@/stores/bridge').useBridgeStore>> => {
  const { useBridgeStore } = await import('@/stores/bridge');
  return useBridgeStore(pinia);
};

let ethersUtilModulePromise: Promise<EthersUtilModule> | null = null;
let subNetworksConnectorModulePromise: Promise<SubNetworksConnectorModule> | null = null;

/**
 * Loads EVM provider helpers only for bridge flows. Pulling `ethers` into the
 * base web3 store makes the app shell pay for EVM code before any bridge UI is used.
 */
const loadEthersUtil = (): Promise<EthersUtilModule> => {
  ethersUtilModulePromise ??= import('@/utils/ethers-util');
  return ethersUtilModulePromise;
};

/**
 * Loads Substrate bridge adapter code only after bridge app metadata is needed.
 */
const loadSubNetworksConnector = (): Promise<SubNetworksConnectorModule> => {
  subNetworksConnectorModulePromise ??= import('@/utils/bridge/sub/classes/adapter');
  return subNetworksConnectorModulePromise;
};

/**
 * Persists the bridge network choice behind the lazy EVM utility boundary.
 */
const persistExternalNetworkSelection = async (
  networkId: BridgeNetworkId,
  networkType: BridgeNetworkType
): Promise<void> => {
  const { default: ethersUtil } = await loadEthersUtil();

  ethersUtil.storeSelectedBridgeType(networkType);
  ethersUtil.storeSelectedNetwork(networkId);
};

const resolveBridgeConnector = async (pinia: Pinia): Promise<Nullable<SubNetworksConnector>> => {
  const bridgeStore = await getBridgeStore(pinia);
  return bridgeStore.subBridgeConnector ?? null;
};

const resolveAutoselectedBridgeAssetAddress = async (pinia: Pinia): Promise<Nullable<string>> => {
  const bridgeStore = await getBridgeStore(pinia);
  return bridgeStore.autoselectedAssetAddress ?? null;
};

const isSubBridgeConnectorReady = (connector?: Nullable<SubNetworksConnector>): boolean => {
  if (!connector) {
    return false;
  }

  return Boolean(connector?.accountApi?.connection?.api && connector?.network?.subNetworkConnection?.nodeIsConnected);
};

const connectSubNetwork = async (store: Web3State & { $pinia: Pinia; selectedNetworkData: Nullable<NetworkData> }) => {
  const subNetwork = store.selectedNetworkData;
  const connector = await resolveBridgeConnector(store.$pinia);

  if (!subNetwork || !connector?.open) {
    return;
  }

  await connector.open(subNetwork.id as SubNetwork);
};

const updateProvidedEvmNetwork = async (store: Web3State & { $pinia: Pinia }, evmNetworkId?: number): Promise<void> => {
  let evmNetwork = evmNetworkId;

  if (evmNetwork == null) {
    const { default: ethersUtil } = await loadEthersUtil();
    evmNetwork = await ethersUtil.getEvmNetworkId();
  }

  web3Mutations.setProvidedEvmNetwork(store, evmNetwork);

  await (await getAssetsStore(store.$pinia)).updateRegisteredAssets();
};

const subscribeOnEvm = async (
  store: Web3State & {
    $pinia: Pinia;
    resetEvmProviderConnection: () => Promise<void>;
  }
): Promise<void> => {
  web3Mutations.resetEvmProviderSubscription(store);

  const { default: ethersUtil, PROVIDER_ERROR } = await loadEthersUtil();
  const subscription = await ethersUtil.watchEthereum({
    onAccountChange: (addressList: string[]) => {
      if (addressList.length) {
        web3Mutations.setEvmAddress(store, addressList[0]);
      } else {
        void store.resetEvmProviderConnection();
      }
    },
    onNetworkChange: (networkHex: string) => {
      const evmNetwork = ethersUtil.hexToNumber(networkHex);
      void updateProvidedEvmNetwork(store, evmNetwork);
    },
    onDisconnect: (error) => {
      if (error?.code === PROVIDER_ERROR.DisconnectedFromChain) {
        return;
      }

      void store.resetEvmProviderConnection();
    },
  });

  web3Mutations.setEvmProviderSubscription(store, subscription);
};

const autoselectBridgeAsset = async (pinia: Pinia): Promise<void> => {
  const assetAddress = await resolveAutoselectedBridgeAssetAddress(pinia);

  if (assetAddress) {
    const bridgeStore = await getBridgeStore(pinia);
    await bridgeStore.setAssetAddress(assetAddress);
  }
};

/**
 * Transitional Pinia facade for the legacy web3 Vuex module.
 * Reads and writes resolve from local Pinia state while the remaining legacy
 * root-store module stays mounted only for old compatibility consumers.
 */
export const useWeb3Store = defineStore('web3-legacy', {
  state: (): Web3State => cloneWeb3State(),
  getters: {
    selectedNetworkData(state): Nullable<NetworkData> {
      return buildSelectedNetwork(state, this.availableNetworks);
    },
    isValidNetwork(state): boolean {
      const selectedNetwork = this.selectedNetworkData;

      if (!selectedNetwork) {
        return false;
      }

      if (state.networkType === BridgeNetworkType.Sub) {
        if (selectedNetwork.evmId) {
          return state.evmProviderNetwork === selectedNetwork.evmId;
        }

        return true;
      }

      return state.evmProviderNetwork === selectedNetwork.id;
    },
    availableNetworks(state): Record<BridgeNetworkType, Partial<Record<BridgeNetworkId, AvailableNetwork>>> {
      return buildAvailableNetworks(state);
    },
    appEvmProviders(state): AppEIPProvider[] {
      const walletStore = useWalletStore();
      const isDesktop = walletStore.isDesktop;

      if (isDesktop) {
        return [WalletConnectProvider];
      }

      const providers: AppEIPProvider[] = state.evmProviders.map((provider) => ({ ...provider }));
      const predefinedProviders: AppEIPProvider[] = [];
      const predefinedWallets = [FearlessWalletProvider, MetamaskProvider, WalletConnectProvider];

      predefinedWallets.forEach((provider) => {
        const injected = providers.find((added) => added.name === provider.name);

        if (injected) {
          injected.uuid = provider.uuid;
        } else {
          predefinedProviders.push(provider);
        }
      });

      return [...providers, ...predefinedProviders].sort((a, b) => {
        if (a.name === FearlessWalletProvider.name) {
          return -1;
        }

        if (b.name === FearlessWalletProvider.name) {
          return 1;
        }

        return 0;
      });
    },
    subAccount(state): Nullable<PolkadotJsAccount> {
      if (!(state.subAddress || state.subAddressName || state.subAddressSource)) {
        return null;
      }

      return {
        address: state.subAddress,
        name: state.subAddressName,
        source: state.subAddressSource as AppWallet,
      };
    },
    contractAddress(state): (asset: KnownEthBridgeAsset) => string {
      return (asset: KnownEthBridgeAsset) => state.ethBridgeContractAddress[asset] ?? '';
    },
    ethBridgeSettings(state): Nullable<EthBridgeSettings> {
      const { ethBridgeEvmNetwork: evmNetwork, ethBridgeContractAddress: address } = state;

      if (!evmNetwork || !address) {
        return null;
      }

      return { evmNetwork, address };
    },
  },
  actions: {
    setSelectNetworkDialogVisibility(flag: boolean): void {
      web3Mutations.setSelectNetworkDialogVisibility(this, flag);
    },
    setSelectProviderDialogVisibility(flag: boolean): void {
      web3Mutations.setSelectProviderDialogVisibility(this, flag);
    },
    setSelectSubNodeDialogVisibility(flag: boolean): void {
      web3Mutations.setSelectSubNodeDialogVisibility(this, flag);
    },
    setSubAccountDialogVisibility(flag: boolean): void {
      web3Mutations.setSubAccountDialogVisibility(this, flag);
    },
    setSoraAccountDialogVisibility(flag: boolean): void {
      web3Mutations.setSoraAccountDialogVisibility(this, flag);
    },
    setEvmNetworksApp(networks: Nullable<EvmNetwork[]> = []): void {
      web3Mutations.setEvmNetworksApp(this, networks);
    },
    setSubNetworkApps(apps: SubNetworkApps = {}): void {
      web3Mutations.setSubNetworkApps(this, apps);
    },
    setEthBridgeSettings(settings?: Nullable<EthBridgeSettings>): void {
      web3Mutations.setEthBridgeSettings(this, settings);
    },
    async selectExternalNetwork(payload: ExternalNetworkSelection): Promise<void> {
      await this.disconnectExternalNetwork();

      web3Mutations.setNetworkType(this, payload.type);
      web3Mutations.setSelectedNetwork(this, payload.id as BridgeNetworkId);
      await persistExternalNetworkSelection(payload.id as BridgeNetworkId, payload.type);

      await Promise.allSettled([
        this.fetchDenominatorCoefficient(),
        getAssetsStore(this.$pinia).then((assetsStore) => assetsStore.getRegisteredAssets()),
        payload.type === BridgeNetworkType.Sub ? connectSubNetwork(this as typeof this & { $pinia: Pinia }) : undefined,
      ]);

      await autoselectBridgeAsset(this.$pinia);
    },
    async disconnectExternalNetwork(): Promise<void> {
      const connector = await resolveBridgeConnector(this.$pinia);
      await connector?.stop?.();
    },
    async resetEvmProviderConnection(): Promise<void> {
      const provider = this.evmProvider;

      web3Mutations.resetEvmAddress(this);
      web3Mutations.resetEvmProvider(this);
      web3Mutations.resetEvmProviderNetwork(this);
      web3Mutations.resetEvmProviderSubscription(this);

      const { default: ethersUtil } = await loadEthersUtil();
      ethersUtil.disconnectEvmProvider(provider);
    },
    async resetSubAccount(): Promise<void> {
      const connector = await resolveBridgeConnector(this.$pinia);
      const accountApi = connector?.accountApi;
      const { logoutApi, isAppStorageSource } = accountUtils;
      const forgetCurrentAccount = !isAppStorageSource(this.subAddressSource as AppWallet);

      if (accountApi) {
        logoutApi(accountApi, forgetCurrentAccount);
      }

      web3Mutations.setSubAccount(this);
    },
    async changeEvmNetworkProvided(): Promise<void> {
      const selectedNetwork = this.selectedNetworkData;

      if (!selectedNetwork) {
        return;
      }

      const { default: ethersUtil } = await loadEthersUtil();
      await ethersUtil.switchOrAddChain(selectedNetwork);
    },
    async selectEvmProvider(provider: AppEIPProvider): Promise<void> {
      try {
        web3Mutations.setEvmProviderLoading(this, provider);

        const { default: ethersUtil } = await loadEthersUtil();
        const address = await ethersUtil.connectEvmProvider(provider, {
          chains: [this.ethBridgeEvmNetwork],
          optionalChains: [...this.evmNetworkApps],
        });

        if (address && this.evmProviderLoading?.uuid === provider.uuid) {
          web3Mutations.setEvmAddress(this, address);
          web3Mutations.setEvmProvider(this, provider);
          await updateProvidedEvmNetwork(this as typeof this & { $pinia: Pinia });
          await subscribeOnEvm(
            this as typeof this & { $pinia: Pinia; resetEvmProviderConnection: () => Promise<void> }
          );
        }
      } finally {
        web3Mutations.setEvmProviderLoading(this);
      }
    },
    async subscribeOnEvmProviders(): Promise<VoidFunction | undefined> {
      return getProvidersList((event) => {
        if (this.evmProviders.map((provider) => provider.uuid).includes(event.detail.info.uuid)) {
          return;
        }

        const { info, provider } = event.detail;
        web3Mutations.addEvmProvider(this, {
          ...info,
          installed: true,
          getProvider: async () => provider,
        });
      });
    },
    async getSupportedApps(): Promise<void> {
      let supportedApps = {
        [BridgeNetworkType.Eth]: {},
        [BridgeNetworkType.Evm]: {},
        [BridgeNetworkType.Sub]: [
          SubNetworkId.Kusama,
          SubNetworkId.KusamaCurio,
          SubNetworkId.KusamaSora,
          SubNetworkId.Polkadot,
          SubNetworkId.PolkadotAstar,
          SubNetworkId.PolkadotAcala,
          SubNetworkId.PolkadotSora,
          SubNetworkId.Liberland,
        ],
      };

      try {
        supportedApps = await soraApi.bridgeProxy.getListApps();
      } catch {
        // Fall back to production defaults when the bridge proxy API is unavailable.
      }

      web3Mutations.setSupportedApps(this, supportedApps as any);

      const networks = this.availableNetworks?.[BridgeNetworkType.Sub];

      if (!networks) {
        return;
      }

      const nodes = Object.entries(networks).reduce((acc, [key, value]) => {
        if (!value?.data?.nodes) {
          return acc;
        }

        return { ...acc, [key]: value.data.nodes };
      }, {});

      const { SubNetworksConnector } = await loadSubNetworksConnector();
      SubNetworksConnector.nodes = nodes;
    },
    async restoreSelectedNetwork(): Promise<void> {
      const { default: ethersUtil } = await loadEthersUtil();
      const rawType = ethersUtil.getSelectedBridgeType();
      const type =
        rawType && Object.values(BridgeNetworkType).includes(rawType as BridgeNetworkType)
          ? (rawType as BridgeNetworkType)
          : null;
      const id = ethersUtil.getSelectedNetwork();

      if (type && id !== null && id !== undefined) {
        const networkData = this.availableNetworks?.[type]?.[id];

        if (!!networkData && !networkData.disabled) {
          await this.selectExternalNetwork({ id, type });
          return;
        }
      }

      await this.selectExternalNetwork({
        id: this.ethBridgeEvmNetwork,
        type: BridgeNetworkType.Eth,
      });
    },
    async getEvmTokenAddressByAssetId(soraAssetId: string): Promise<string> {
      try {
        if (!soraAssetId) {
          return '';
        }

        const contractAbi = SmartContracts[SmartContractType.EthBridge][KnownEthBridgeAsset.Other];
        const contractAddress = this.contractAddress(KnownEthBridgeAsset.Other);

        if (!contractAddress || !contractAbi) {
          throw new Error('Contract address/abi is not found');
        }

        const { default: ethersUtil } = await loadEthersUtil();
        const contractInstance = await ethersUtil.getContract(contractAddress, contractAbi);
        const externalAddress = await contractInstance._sidechainTokens(soraAssetId);

        if (ethersUtil.isNativeEvmTokenAddress(externalAddress)) {
          throw new Error('Asset is not registered');
        }

        return externalAddress;
      } catch (error) {
        console.error(soraAssetId, error);
        return '';
      }
    },
    async selectSubAccount(account: PolkadotJsAccount): Promise<void> {
      const connector = await resolveBridgeConnector(this.$pinia);

      if (!isSubBridgeConnectorReady(connector)) {
        web3Mutations.setSubAccountDialogVisibility(this, false);
        web3Mutations.setSelectSubNodeDialogVisibility(this, true);
        return;
      }

      const { accountApi } = connector;
      const { loginApi, isAppStorageSource } = accountUtils;

      await loginApi(accountApi, account, isAppStorageSource(this.subAddressSource as AppWallet));
      web3Mutations.setSubAccount(this, {
        address: account.address,
        name: account.name,
        source: account.source,
      });
    },
    async changeSubAccountName(payload: { address: string; name: string }): Promise<void> {
      const connector = await resolveBridgeConnector(this.$pinia);
      const accountApi = connector?.accountApi;
      const subAccount = this.subAccount;

      if (!(accountApi && subAccount)) {
        return;
      }

      accountApi.changeAccountName(payload.address, payload.name);

      if (accountApi.formatAddress(subAccount.address, false) === accountApi.formatAddress(payload.address, false)) {
        web3Mutations.setSubAccount(this, {
          ...subAccount,
          name: payload.name,
        });
      }
    },
    async fetchDenominatorCoefficient(): Promise<void> {
      try {
        const denominator = await soraApi.system.getDenominator();

        if (denominator.isFinity() && !denominator.isZero()) {
          web3Mutations.setDenominator(this, denominator);
        } else {
          web3Mutations.setDenominator(this, FPNumber.ONE);
        }
      } catch {
        web3Mutations.setDenominator(this, FPNumber.ONE);
      }
    },
  },
});
