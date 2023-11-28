import { Operation } from '@sora-substrate/util';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { defineGetters } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import { bridgeGetterContext } from '@/store/bridge';
import { formatSubAddress } from '@/utils/bridge/sub/utils';

import type { BridgeState } from './types';
import type { IBridgeTransaction, CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

const getters = defineGetters<BridgeState>()({
  asset(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = bridgeGetterContext(args);
    const { assetAddress, assetSenderBalance: sender, assetRecipientBalance: recipient, isSoraToEvm } = state;
    const token = rootGetters.assets.assetDataByAddress(assetAddress);

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
    const { rootGetters } = bridgeGetterContext(args);
    const {
      web3: { selectedNetwork },
      assets: { whitelistAssets, assetDataByAddress },
    } = rootGetters;

    if (!selectedNetwork) return null;
    // find sora asset in whitelist by symbol (we know only external native token symbol)
    const { symbol } = selectedNetwork.nativeCurrency;
    const soraAsset = whitelistAssets.find((asset) => asset.symbol === symbol);

    if (!soraAsset) return null;

    return assetDataByAddress(soraAsset.address);
  },

  isRegisteredAsset(...args): boolean {
    const { getters, rootState } = bridgeGetterContext(args);

    const { asset, isSubBridge } = getters;
    const { registeredAssets } = rootState.assets;

    if (!asset) return false;
    if (!(asset.address in registeredAssets)) return false;

    // We don't have asset external address for substrate bridge
    if (isSubBridge) return true;

    return !!asset?.externalAddress;
  },

  externalAccount(...args): string {
    const { getters, rootState } = bridgeGetterContext(args);
    const { evmAddress, subAddress } = rootState.web3;

    if (getters.isSubBridge) {
      return subAddress;
    } else {
      return evmAddress;
    }
  },

  externalAccountFormatted(...args): string {
    const { getters, state, rootState } = bridgeGetterContext(args);
    const { subSS58 } = rootState.web3;

    if (getters.isSubBridge && state.isSoraToEvm && getters.externalAccount) {
      return formatSubAddress(getters.externalAccount, subSS58);
    } else {
      return getters.externalAccount;
    }
  },

  sender(...args): string {
    const { state, rootState, getters } = bridgeGetterContext(args);
    const { address: soraAddress } = rootState.wallet.account;
    const { evmAddress, subSS58 } = rootState.web3;

    if (getters.isSubBridge) {
      return !state.isSoraToEvm && soraAddress ? formatSubAddress(soraAddress, subSS58) : soraAddress;
    }

    return state.isSoraToEvm ? soraAddress : evmAddress;
  },

  senderName(...args): string {
    const { state, rootState, getters } = bridgeGetterContext(args);
    if (getters.isSubBridge) {
      return rootState.wallet.account.name;
    }
    return state.isSoraToEvm ? rootState.wallet.account.name : '';
  },

  recipient(...args): string {
    const { state, rootState, getters } = bridgeGetterContext(args);
    const { address: soraAddress } = rootState.wallet.account;
    const { evmAddress, subAddress, subSS58 } = rootState.web3;

    if (getters.isSubBridge) {
      return state.isSoraToEvm && subAddress ? formatSubAddress(subAddress, subSS58) : subAddress;
    }

    return state.isSoraToEvm ? evmAddress : soraAddress;
  },

  recipientName(...args): string {
    const { state, rootState, getters } = bridgeGetterContext(args);
    if (getters.isSubBridge) {
      return rootState.web3.subAddressName;
    }
    return state.isSoraToEvm ? '' : rootState.wallet.account.name;
  },

  isEthBridge(...args): boolean {
    const { rootState } = bridgeGetterContext(args);

    return rootState.web3.networkType === BridgeNetworkType.Eth;
  },
  isEvmBridge(...args): boolean {
    const { rootState } = bridgeGetterContext(args);

    return rootState.web3.networkType === BridgeNetworkType.Evm;
  },
  isSubBridge(...args): boolean {
    const { rootState } = bridgeGetterContext(args);

    return rootState.web3.networkType === BridgeNetworkType.Sub;
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
  networkHistoryLoading(...args): boolean {
    const { state, rootState } = bridgeGetterContext(args);
    const { networkSelected } = rootState.web3;

    return !!(networkSelected && state.historyLoading[networkSelected]);
  },
});

export default getters;
