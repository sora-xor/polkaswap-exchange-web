import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';

import type { AppEIPProvider } from '@/types/evm/provider';

import type { Web3State, EthBridgeSettings, SubNetworkApps } from './types';
import type { FPNumber } from '@sora-substrate/math';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { SupportedApps, BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

const mutations = {
  setEvmAddress(state, address: string): void {
    state.evmAddress = address.toLowerCase();
  },
  resetEvmAddress(state): void {
    state.evmAddress = '';
  },

  setSubAccount(state, data?: { address: string; name: string; source?: string }): void {
    const { address = '', name = '', source = '' } = data ?? {};

    state.subAddress = address;
    state.subAddressName = name;
    state.subAddressSource = source;
  },

  setEvmNetworksApp(state, networksIds: Nullable<EvmNetwork[]> = []): void {
    state.evmNetworkApps = Object.freeze(Array.isArray(networksIds) ? [...networksIds] : []);
  },
  setSubNetworkApps(state, apps: Nullable<SubNetworkApps> = {}): void {
    state.subNetworkApps = Object.freeze(apps && typeof apps === 'object' ? { ...apps } : {});
  },
  setSupportedApps(state, supportedApps: SupportedApps): void {
    state.supportedApps = Object.freeze({ ...supportedApps });
  },

  addEvmProvider(state, appEvmProvider: AppEIPProvider): void {
    state.evmProviders = [...state.evmProviders, appEvmProvider];
  },
  setEvmProvider(state, appEvmProvider: AppEIPProvider): void {
    state.evmProvider = appEvmProvider;
  },
  resetEvmProvider(state): void {
    state.evmProvider = null;
  },
  setEvmProviderLoading(state, appEvmProvider: Nullable<AppEIPProvider> = null): void {
    state.evmProviderLoading = appEvmProvider;
  },

  setProvidedEvmNetwork(state, networkId: BridgeNetworkId | null): void {
    state.evmProviderNetwork = networkId;
  },
  resetEvmProviderNetwork(state): void {
    state.evmProviderNetwork = null;
  },
  setEvmProviderSubscription(state, subscription: FnWithoutArgs): void {
    state.evmProviderSubscription = subscription;
  },
  resetEvmProviderSubscription(state): void {
    state.evmProviderSubscription?.();
    state.evmProviderSubscription = null;
  },
  setSelectedNetwork(state, networkId: BridgeNetworkId): void {
    state.networkSelected = networkId;
  },

  setNetworkType(state, networkType: BridgeNetworkType): void {
    state.networkType = networkType;
  },

  setSelectSubNodeDialogVisibility(state, flag: boolean): void {
    state.selectSubNodeDialogVisibility = flag;
  },

  setSelectNetworkDialogVisibility(state, flag: boolean): void {
    state.selectNetworkDialogVisibility = flag;
  },

  setSelectProviderDialogVisibility(state, flag: boolean): void {
    state.selectProviderDialogVisibility = flag;
  },

  setSubAccountDialogVisibility(state, flag: boolean): void {
    state.subAccountDialogVisibility = flag;
  },

  setSoraAccountDialogVisibility(state, flag: boolean): void {
    state.soraAccountDialogVisibility = flag;
  },

  setEthBridgeSettings(state, settings?: Nullable<Partial<EthBridgeSettings>>): void {
    if (!settings) return;

    const currentAddress = state.ethBridgeContractAddress;

    if (settings.evmNetwork != null) {
      state.ethBridgeEvmNetwork = settings.evmNetwork;
    }

    state.ethBridgeContractAddress = Object.freeze({
      XOR: settings.address?.XOR ?? currentAddress.XOR,
      VAL: settings.address?.VAL ?? currentAddress.VAL,
      OTHER: settings.address?.OTHER ?? currentAddress.OTHER,
    });
  },

  setDenominator(state, denominator: FPNumber): void {
    state.denominator = denominator;
  },
};

export default mutations;
