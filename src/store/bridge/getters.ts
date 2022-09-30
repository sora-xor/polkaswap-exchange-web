import { defineGetters } from 'direct-vuex';
import { Operation } from '@sora-substrate/util';
import type { CodecString } from '@sora-substrate/util';
import type { EvmHistory } from '@sora-substrate/util/build/evm/types';

import { bridgeGetterContext } from '@/store/bridge';
import { ZeroStringValue } from '@/consts';
import ethersUtil from '@/utils/ethers-util';
import type { BridgeState } from './types';
import type { RegisteredAccountAssetWithDecimals } from '../assets/types';

const getters = defineGetters<BridgeState>()({
  asset(...args): Nullable<RegisteredAccountAssetWithDecimals> {
    const { state, rootGetters } = bridgeGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.assetAddress);
    const balance = state.assetBalance;

    if (balance) {
      return { ...token, balance } as RegisteredAccountAssetWithDecimals;
    }

    return token;
  },
  isRegisteredAsset(...args): boolean {
    const { getters } = bridgeGetterContext(args);
    return !!getters.asset?.externalAddress;
  },
  // TODO [EVM]
  soraNetworkFee(...args): CodecString {
    const { state, rootState } = bridgeGetterContext(args);
    // In direction EVM -> SORA sora network fee is 0
    return state.isSoraToEvm ? rootState.wallet.settings.networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue;
  },
  evmNetworkFee(...args): CodecString {
    const { state } = bridgeGetterContext(args);
    // In direction SORA -> EVM evm network fee is 0
    return !state.isSoraToEvm ? state.evmNetworkFee : ZeroStringValue;
  },
  history(...args): EvmHistory[] {
    const { state, rootState } = bridgeGetterContext(args);

    const externalNetwork = rootState.web3.evmNetworkSelected;
    // filter history from all sources by selected evm network
    return [...state.historyInternal, ...state.historyExternal].filter(
      (item) => item.externalNetwork === externalNetwork
    );
  },
  historyItem(...args): Nullable<EvmHistory> {
    const { state, getters } = bridgeGetterContext(args);

    if (!state.historyId) return null;

    return getters.history.find((item) => item.id === state.historyId) ?? null;
  },
  // TODO [EVM] check usage after EVM-SORA flow
  isTxEvmAccount(...args): boolean {
    const { getters, rootState } = bridgeGetterContext(args);

    const historyAddress = getters.historyItem?.to;
    const currentAddress = rootState.web3.evmAddress;

    return !historyAddress || ethersUtil.addressesAreEqual(historyAddress, currentAddress);
  },
});

export default getters;
