import { Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EthAssetKind } from '@sora-substrate/sdk/build/bridgeProxy/eth/consts';
import { SubAssetKind } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { defineGetters } from '@/store/module-helpers';

import { ZeroStringValue } from '@/consts';
import { bridgeGetterContext } from '@/store/bridge';
import { resolveAssetLookup, resolveRegisteredAssets } from '@/store/bridge/utils';
import { isWaitingForAction } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import { requireAppStore } from '@/utils/app-store';

import type { BridgeState } from './types';
import type { IBridgeTransaction, CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

const chainAddress = (address: string, connector: SubNetworksConnector) => {
  return connector.network?.subNetworkConnection.nodeIsConnected ? connector.network.formatAddress(address) : address;
};

const resolveWalletAccount = (rootState: any) => {
  const account = rootState?.wallet?.account;
  if (account) return account;

  const legacyStore = requireAppStore();

  return legacyStore?.state?.wallet?.account;
};

const resolveAssetsRegistry = (rootState: any) => {
  const assetsState = rootState?.assets ?? requireAppStore()?.state?.assets ?? {};
  return resolveRegisteredAssets(assetsState);
};

const resolveWeb3State = (rootState: any) => {
  return rootState?.web3 ?? requireAppStore()?.state?.web3 ?? {};
};

const getters = defineGetters<BridgeState>()({
  asset(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = bridgeGetterContext(args);
    const { assetAddress, assetSenderBalance: sender, assetRecipientBalance: recipient, isSoraToEvm } = state;
    const assetLookup = resolveAssetLookup(rootGetters);
    const token = assetLookup(assetAddress);

    if (!token) return null;
    // to save old logic, pass sender & recipient balances
    const [balance, externalBalance] = isSoraToEvm ? [sender, recipient] : [recipient, sender];
    const asset = {
      ...token,
      balance: { transferable: balance },
      externalBalance,
    } as RegisteredAccountAsset;

    return asset;
  },

  nativeToken(...args): Nullable<RegisteredAccountAsset> {
    const { rootGetters, rootState } = bridgeGetterContext(args);
    const assetLookup = resolveAssetLookup(rootGetters);
    const assets = resolveWalletAccount(rootState)?.assets ?? [];
    const {
      web3: { selectedNetwork },
    } = rootGetters;

    if (!selectedNetwork) return null;

    const symbol = selectedNetwork.nativeCurrency?.symbol;

    if (!symbol) return null;

    const filteredBySymbol = assets.filter((asset) => asset.symbol === symbol);

    const registry = resolveAssetsRegistry(rootState);

    const registered = filteredBySymbol.find((asset) => asset.address in registry);

    if (!registered) return null;

    return assetLookup(registered.address);
  },

  isNativeTokenSelected(...args): boolean {
    const { getters } = bridgeGetterContext(args);
    const { asset, nativeToken } = getters;

    return !!(nativeToken && asset && nativeToken.address === asset.address);
  },

  isRegisteredAsset(...args): boolean {
    const { getters, rootState } = bridgeGetterContext(args);

    const { asset, isSubBridge } = getters;
    const registeredAssets = resolveAssetsRegistry(rootState);

    if (!asset) return false;
    if (!(asset.address in registeredAssets)) return false;

    // We don't have asset external address for substrate bridge
    if (isSubBridge) return true;

    return !!asset?.externalAddress;
  },

  isSidechainAsset(...args): boolean {
    const { getters, rootState } = bridgeGetterContext(args);
    const { asset, isSubBridge } = getters;
    const registeredAssets = resolveAssetsRegistry(rootState);

    if (!asset) return false;
    if (!(asset.address in registeredAssets)) return false;

    const registered = registeredAssets[asset.address];
    const kind = registered.kind;
    const sidechainKind = isSubBridge ? SubAssetKind.Sidechain : EthAssetKind.Sidechain;

    return kind === sidechainKind;
  },

  autoselectedAssetAddress(...args): Nullable<string> {
    const { rootState } = bridgeGetterContext(args);
    const registeredAssets = resolveAssetsRegistry(rootState);
    const assetIds = Object.keys(registeredAssets);

    if (assetIds.length !== 1) return null;

    return assetIds[0];
  },

  isSubAccountType(...args): boolean {
    const { rootState } = bridgeGetterContext(args);
    const { networkSelected, networkType } = resolveWeb3State(rootState);

    if (networkType === BridgeNetworkType.Sub) {
      return !subBridgeApi.isEvmAccount(networkSelected as SubNetwork);
    }

    return false;
  },

  externalAccount(...args): string {
    const { getters, rootState } = bridgeGetterContext(args);
    const { evmAddress, subAddress } = resolveWeb3State(rootState);

    if (getters.isSubAccountType) {
      return subAddress;
    } else {
      return evmAddress;
    }
  },

  sender(...args): string {
    const { state, rootState, getters } = bridgeGetterContext(args);
    const soraAddress = resolveWalletAccount(rootState)?.address ?? '';
    const { evmAddress, subAddress } = resolveWeb3State(rootState);

    if (state.isSoraToEvm) return soraAddress;

    return getters.isSubAccountType ? chainAddress(subAddress, state.subBridgeConnector) : evmAddress;
  },

  senderName(...args): string {
    const { state, rootState, getters } = bridgeGetterContext(args);
    const soraName = resolveWalletAccount(rootState)?.name ?? '';
    const { subAddressName } = resolveWeb3State(rootState);

    if (state.isSoraToEvm) return soraName;

    return getters.isSubAccountType ? subAddressName : '';
  },

  recipient(...args): string {
    const { state, rootState, getters } = bridgeGetterContext(args);
    const soraAddress = resolveWalletAccount(rootState)?.address ?? '';
    const { evmAddress, subAddress } = resolveWeb3State(rootState);

    if (!state.isSoraToEvm) return soraAddress;

    return getters.isSubAccountType ? chainAddress(subAddress, state.subBridgeConnector) : evmAddress;
  },

  recipientName(...args): string {
    const { state, rootState, getters } = bridgeGetterContext(args);
    const soraName = resolveWalletAccount(rootState)?.name ?? '';
    const { subAddressName } = resolveWeb3State(rootState);

    if (!state.isSoraToEvm) return soraName;

    return getters.isSubAccountType ? subAddressName : '';
  },

  isEthBridge(...args): boolean {
    const { rootState } = bridgeGetterContext(args);
    return resolveWeb3State(rootState).networkType === BridgeNetworkType.Eth;
  },
  isEvmBridge(...args): boolean {
    const { rootState } = bridgeGetterContext(args);
    return resolveWeb3State(rootState).networkType === BridgeNetworkType.Evm;
  },
  isSubBridge(...args): boolean {
    const { rootState } = bridgeGetterContext(args);
    return resolveWeb3State(rootState).networkType === BridgeNetworkType.Sub;
  },
  operation(...args): Operation {
    const { state, getters } = bridgeGetterContext(args);
    if (getters.isEthBridge) {
      return state.isSoraToEvm ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming;
    } else if (getters.isEvmBridge) {
      return state.isSoraToEvm ? Operation.EvmOutgoing : Operation.EvmIncoming;
    } else {
      return state.isSoraToEvm ? Operation.SubstrateOutgoing : Operation.SubstrateIncoming;
    }
  },
  externalNetworkFee(...args): CodecString {
    const { state, getters } = bridgeGetterContext(args);

    if (getters.isEthBridge) {
      return state.externalNetworkFee;
    } else {
      return !state.isSoraToEvm ? state.externalNetworkFee : ZeroStringValue;
    }
  },
  history(...args): Record<string, IBridgeTransaction> {
    const { state } = bridgeGetterContext(args);

    const internalHistory = Object.values(state.historyInternal);

    return [...internalHistory].reduce((buffer, item) => {
      if (!item.id) return buffer;

      return { ...buffer, [item.id]: item };
    }, {});
  },
  historyItem(...args): Nullable<IBridgeTransaction> {
    const { state, getters } = bridgeGetterContext(args);

    if (!state.historyId) return null;

    return getters.history[state.historyId] ?? null;
  },
  networkHistoryId(...args): Nullable<BridgeNetworkId> {
    const { getters, rootState } = bridgeGetterContext(args);
    const { networkSelected } = resolveWeb3State(rootState);

    if (!networkSelected) return null;
    if (!getters.isSubBridge) return networkSelected;

    const subNetworkId = networkSelected as SubNetwork;

    return subBridgeApi.isStandalone(subNetworkId)
      ? subNetworkId
      : subBridgeApi.getRelayChain(networkSelected as SubNetwork);
  },
  networkHistoryLoading(...args): boolean {
    const { getters, state } = bridgeGetterContext(args);
    const { networkHistoryId } = getters;

    return !!(networkHistoryId && state.historyLoading[networkHistoryId]);
  },

  hasWaitingForActionTx(...args): boolean {
    const { getters } = bridgeGetterContext(args);

    const history = getters.history || {};

    if (!history || typeof history !== 'object') return false;

    return Object.values(history).some((item) => isWaitingForAction(item));
  },
});

export default getters;
