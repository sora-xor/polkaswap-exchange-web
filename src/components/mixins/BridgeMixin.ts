import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { getter, mutation, state } from '@/store/decorators';

import type { CodecString, RegisteredAccountAsset } from '@sora-substrate/util';

@Component
export default class BridgeMixin extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @state.bridge.externalNativeBalance externalNativeBalance!: CodecString;
  @state.bridge.externalBlockNumber externalBlockNumber!: number;

  @getter.web3.isValidNetwork isValidNetwork!: boolean;
  @getter.bridge.sender sender!: string;
  @getter.bridge.recipient recipient!: string;
  @getter.bridge.soraNetworkFee soraNetworkFee!: CodecString;
  @getter.bridge.evmNetworkFee evmNetworkFee!: CodecString;
  @getter.assets.xor xor!: RegisteredAccountAsset;

  @mutation.web3.setSelectNetworkDialogVisibility setSelectNetworkDialogVisibility!: (flag: boolean) => void;

  get evmTokenSymbol(): string {
    return this.selectedNetwork?.nativeCurrency?.symbol ?? '';
  }
}
