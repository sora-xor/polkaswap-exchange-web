import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { getter, mutation, state } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class BridgeMixin extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @state.bridge.externalNativeBalance externalNativeBalance!: CodecString;
  @state.bridge.externalBlockNumber externalBlockNumber!: number;
  @state.bridge.assetLockedBalance assetLockedBalance!: Nullable<CodecString>;

  @getter.web3.isValidNetwork isValidNetwork!: boolean;
  @getter.bridge.asset asset!: Nullable<RegisteredAccountAsset>;
  @getter.bridge.sender sender!: string;
  @getter.bridge.recipient recipient!: string;
  @getter.bridge.soraNetworkFee soraNetworkFee!: CodecString;
  @getter.bridge.externalNetworkFee externalNetworkFee!: CodecString;
  @getter.assets.xor xor!: RegisteredAccountAsset;

  @mutation.web3.setSelectNetworkDialogVisibility setSelectNetworkDialogVisibility!: (flag: boolean) => void;

  get nativeTokenSymbol(): string {
    return this.selectedNetwork?.nativeCurrency?.symbol ?? '';
  }

  get nativeTokenDecimals(): number | undefined {
    return this.selectedNetwork?.nativeCurrency?.decimals;
  }
}
