import { defineGetters } from 'direct-vuex';
import { Operation, CodecString, BridgeHistory } from '@sora-substrate/util';

import { bridgeGetterContext } from '@/store/bridge';
import { rootGetterContext } from '@/store';
import { ZeroStringValue } from '@/consts';
import ethersUtil from '@/utils/ethers-util';
import type { BridgeState } from './types';
import type { RegisteredAccountAssetWithDecimals } from '../assets/types';

const getters = defineGetters<BridgeState>()({
  asset(...args): Nullable<RegisteredAccountAssetWithDecimals> {
    const [stateArgs, gettersArgs] = args;
    const { state } = bridgeGetterContext(args);
    const { rootGetters } = rootGetterContext([stateArgs, gettersArgs]);
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
  soraNetworkFee(...args): CodecString {
    const [stateArgs, gettersArgs] = args;
    const { state } = bridgeGetterContext(args);
    const { rootState } = rootGetterContext([stateArgs, gettersArgs]);
    // In direction EVM -> SORA sora network fee is 0, because related extrinsic calls by system automaically
    return state.isSoraToEvm ? rootState.wallet.settings.networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue;
  },
  historyItem(...args): Nullable<BridgeHistory> {
    const { state } = bridgeGetterContext(args);
    if (!state.historyId) return null;

    return state.history.find((item) => item.id === state.historyId) ?? null;
  },
  isTxEvmAccount(...args): boolean {
    const [stateArgs, gettersArgs] = args;
    const { getters } = bridgeGetterContext(args);
    const { rootState } = rootGetterContext([stateArgs, gettersArgs]);

    const historyAddress = getters.historyItem?.to;
    const currentAddress = rootState.web3.evmAddress;

    return !historyAddress || ethersUtil.addressesAreEqual(historyAddress, currentAddress);
  },
});

export default getters;
