import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { defineMutations } from 'direct-vuex';

import type { AppEIPProvider } from '@/types/evm/provider';
import ethersUtil from '@/utils/ethers-util';

import type { Web3State, EthBridgeSettings, SubNetworkApps } from './types';
import type { FPNumber } from '@sora-substrate/sdk';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { SupportedApps, BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

const mutations = defineMutations<Web3State>()({
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

  setEvmNetworksApp(state, networksIds: EvmNetwork[]): void {
    state.evmNetworkApps = Object.freeze([...networksIds]);
  },
  setSubNetworkApps(state, apps: SubNetworkApps): void {
    state.subNetworkApps = Object.freeze({ ...apps });
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

  // by provider
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
  // by user
  setSelectedNetwork(state, networkId: BridgeNetworkId): void {
    state.networkSelected = networkId;
    ethersUtil.storeSelectedNetwork(networkId);
  },

  setNetworkType(state, networkType: BridgeNetworkType) {
    state.networkType = networkType;
    ethersUtil.storeSelectedBridgeType(networkType);
  },

  // dialogs
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

  // for hashi bridge
  setEthBridgeSettings(state, { evmNetwork, address }: EthBridgeSettings): void {
    state.ethBridgeEvmNetwork = evmNetwork;
    state.ethBridgeContractAddress = Object.freeze({
      XOR: address.XOR,
      VAL: address.VAL,
      OTHER: address.OTHER,
    });
  },

  setDenominator(state, denominator: FPNumber): void {
    state.denominator = denominator;
  },
});

export default mutations;
