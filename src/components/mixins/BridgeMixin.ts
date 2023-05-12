import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import type { CodecString, RegisteredAccountAsset } from '@sora-substrate/util';
import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { getter, mutation, state } from '@/store/decorators';

@Component
export default class BridgeMixin extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @state.web3.evmBalance evmBalance!: CodecString;
  @state.web3.evmNetwork evmNetwork!: EvmNetwork;
  @state.bridge.evmBlockNumber evmBlockNumber!: number;

  @getter.web3.isValidNetwork isValidNetwork!: boolean;
  @getter.bridge.soraNetworkFee soraNetworkFee!: CodecString;
  @getter.bridge.evmNetworkFee evmNetworkFee!: CodecString;
  @getter.assets.xor xor!: RegisteredAccountAsset;

  @mutation.web3.setSelectNetworkDialogVisibility setSelectNetworkDialogVisibility!: (flag: boolean) => void;

  get evmTokenSymbol(): string {
    return this.selectedEvmNetwork?.nativeCurrency?.symbol ?? '';
  }
}
