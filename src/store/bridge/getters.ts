import { Operation, FPNumber } from '@sora-substrate/util';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { defineGetters } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import { bridgeGetterContext } from '@/store/bridge';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { subBridgeApi } from '@/utils/bridge/sub/api';

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

  isRegisteredAsset(...args): boolean {
    const { getters, rootState } = bridgeGetterContext(args);

    const { asset, isSubBridge } = getters;
    const { registeredAssets } = rootState.assets;

    if (!asset) return false;
    if (!(asset.address in registeredAssets)) return false;

    // [TODO]: We don't have external address for substrate bridge yet
    if (isSubBridge) return true;

    return !!asset?.externalAddress;
  },

  sender(...args): string {
    const { state, rootState, getters } = bridgeGetterContext(args);

    if (getters.isSubBridge) return rootState.wallet.account.address;

    return state.isSoraToEvm ? rootState.wallet.account.address : rootState.web3.evmAddress;
  },

  recipient(...args): string {
    const { state, rootState, getters } = bridgeGetterContext(args);

    if (getters.isSubBridge) return rootState.web3.subAddress;

    return state.isSoraToEvm ? rootState.web3.evmAddress : rootState.wallet.account.address;
  },

  isEthBridge(...args): boolean {
    const { rootState } = bridgeGetterContext(args);

    return rootState.web3.networkType === BridgeNetworkType.EvmLegacy;
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
    // [TODO]: add SUB network operations
    if (getters.isEthBridge) {
      return state.isSoraToEvm ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming;
    } else if (getters.isEvmBridge) {
      return state.isSoraToEvm ? Operation.EvmOutgoing : Operation.EvmIncoming;
    } else {
      return state.isSoraToEvm ? Operation.SubstrateOutgoing : Operation.SubstrateIncoming;
    }
  },
  soraNetworkFee(...args): CodecString {
    const { getters, rootState } = bridgeGetterContext(args);
    return rootState.wallet.settings.networkFees[getters.operation] ?? ZeroStringValue;
  },
  // fee for transaction execution
  externalNetworkFee(...args): CodecString {
    const { state, getters } = bridgeGetterContext(args);

    if (getters.isEthBridge) {
      return state.externalNetworkFee;
    } else {
      // In direction SORA -> EVM evm network fee is 0
      return !state.isSoraToEvm ? state.externalNetworkFee : ZeroStringValue;
    }
  },
  history(...args): Record<string, IBridgeTransaction> {
    const { state } = bridgeGetterContext(args);

    const internalHistory = Object.values(state.historyInternal);
    const externalHistory = Object.values(state.historyExternal);

    return [...internalHistory, ...externalHistory].reduce((buffer, item) => {
      if (!item.id) return buffer;

      return { ...buffer, [item.id]: item };
    }, {});
  },
  historyItem(...args): Nullable<IBridgeTransaction> {
    const { state, getters } = bridgeGetterContext(args);

    if (!state.historyId) return null;

    return getters.history[state.historyId] ?? null;
  },

  bridgeApi(...args): typeof ethBridgeApi | typeof evmBridgeApi | typeof subBridgeApi {
    const { getters } = bridgeGetterContext(args);

    if (getters.isSubBridge) return subBridgeApi;

    return getters.isEthBridge ? ethBridgeApi : evmBridgeApi;
  },
});

export default getters;
