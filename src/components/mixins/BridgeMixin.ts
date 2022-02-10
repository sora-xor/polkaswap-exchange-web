import { Component, Mixins } from 'vue-property-decorator';
import { Action, Getter, State } from 'vuex-class';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { BridgeNetworks } from '@sora-substrate/util';
import type { CodecString, RegisteredAccountAsset, RegisteredAsset } from '@sora-substrate/util';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { EvmSymbol } from '@/consts';

@Component
export default class BridgeMixin extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @State((state) => state.bridge.evmNetworkFee) evmNetworkFee!: CodecString;
  @State((state) => state.bridge.evmBlockNumber) evmBlockNumber!: number;

  @Getter('isValidNetworkType', { namespace: 'web3' }) isValidNetworkType!: boolean;
  @Getter('evmNetwork', { namespace: 'web3' }) evmNetwork!: BridgeNetworks;
  @Getter('evmBalance', { namespace: 'web3' }) evmBalance!: CodecString;
  @Getter('soraNetworkFee', { namespace: 'bridge' }) soraNetworkFee!: CodecString;
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: RegisteredAsset & RegisteredAccountAsset;

  @Action('getEvmNetworkFee', { namespace: 'bridge' }) getEvmNetworkFee!: AsyncVoidFn;

  get evmTokenSymbol(): string {
    if (this.evmNetwork === BridgeNetworks.ENERGY_NETWORK_ID) {
      return EvmSymbol.VT;
    }
    return EvmSymbol.ETH;
  }
}
