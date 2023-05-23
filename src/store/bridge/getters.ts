import { defineGetters } from 'direct-vuex';
import { Operation } from '@sora-substrate/util';
import type { IBridgeTransaction, CodecString, RegisteredAccountAsset } from '@sora-substrate/util';

import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { bridgeGetterContext } from '@/store/bridge';
import { ZeroStringValue } from '@/consts';
import { BridgeType } from '@/consts/evm';
import ethersUtil from '@/utils/ethers-util';
import type { BridgeState } from './types';

const getters = defineGetters<BridgeState>()({
  asset(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = bridgeGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.assetAddress);
    const balance = state.assetBalance;

    if (balance) {
      return { ...token, balance } as RegisteredAccountAsset;
    }

    return token;
  },
  isRegisteredAsset(...args): boolean {
    const { getters } = bridgeGetterContext(args);
    return !!getters.asset?.externalAddress;
  },
  isEthBridge(...args): boolean {
    const { rootState } = bridgeGetterContext(args);

    return rootState.web3.networkType === BridgeType.ETH;
  },
  isEvmBridge(...args): boolean {
    const { rootState } = bridgeGetterContext(args);

    return rootState.web3.networkType === BridgeType.EVM;
  },
  operation(...args): Operation {
    const { state, getters } = bridgeGetterContext(args);
    // [TODO]: add SUB network operations
    if (getters.isEthBridge) {
      return state.isSoraToEvm ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming;
    } else {
      return state.isSoraToEvm ? Operation.EvmOutgoing : Operation.EvmIncoming;
    }
  },
  soraNetworkFee(...args): CodecString {
    const { getters, rootState } = bridgeGetterContext(args);
    return rootState.wallet.settings.networkFees[getters.operation] ?? ZeroStringValue;
  },
  evmNetworkFee(...args): CodecString {
    const { state, getters } = bridgeGetterContext(args);

    if (getters.isEthBridge) {
      return state.evmNetworkFee;
    } else {
      // In direction SORA -> EVM evm network fee is 0
      return !state.isSoraToEvm ? state.evmNetworkFee : ZeroStringValue;
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
  // TODO [EVM] check usage after EVM-SORA flow
  isTxEvmAccount(...args): boolean {
    const { getters, rootState } = bridgeGetterContext(args);

    const historyAddress = getters.historyItem?.to;
    const currentAddress = rootState.web3.evmAddress;

    return !historyAddress || ethersUtil.addressesAreEqual(historyAddress, currentAddress);
  },
  bridgeApi(...args): typeof ethBridgeApi | typeof evmBridgeApi {
    const { getters } = bridgeGetterContext(args);
    const api = getters.isEthBridge ? ethBridgeApi : evmBridgeApi;

    return api;
  },
});

export default getters;
