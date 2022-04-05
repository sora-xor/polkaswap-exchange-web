import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { BridgeNetworks } from '@sora-substrate/util';
import type { CodecString } from '@sora-substrate/util';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { EvmSymbol } from '@/consts';
import { getter, state } from '@/store/decorators';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

@Component
export default class BridgeMixin extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @state.web3.evmBalance evmBalance!: CodecString;
  @state.web3.evmNetwork evmNetwork!: BridgeNetworks;
  @state.bridge.evmNetworkFee evmNetworkFee!: CodecString;
  @state.bridge.evmBlockNumber evmBlockNumber!: number;

  @getter.web3.isValidNetworkType isValidNetworkType!: boolean;
  @getter.bridge.soraNetworkFee soraNetworkFee!: CodecString;
  @getter.assets.xor xor!: RegisteredAccountAssetWithDecimals;

  get evmTokenSymbol(): string {
    if (this.evmNetwork === BridgeNetworks.ENERGY_NETWORK_ID) {
      return EvmSymbol.VT;
    }
    return EvmSymbol.ETH;
  }
}
