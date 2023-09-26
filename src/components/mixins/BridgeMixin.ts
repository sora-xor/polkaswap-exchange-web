import { FPNumber } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { PageNames } from '@/consts';
import router from '@/router';
import { getter, state } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class BridgeMixin extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @state.bridge.externalNativeBalance externalNativeBalance!: CodecString;
  @state.bridge.assetLockedBalance assetLockedBalance!: Nullable<FPNumber>;
  @state.bridge.outgoingMaxLimit outgoingMaxLimit!: Nullable<FPNumber>;
  @state.bridge.incomingMinLimit incomingMinAmount!: FPNumber;

  @getter.web3.isValidNetwork isValidNetwork!: boolean;
  @getter.bridge.asset asset!: Nullable<RegisteredAccountAsset>;
  @getter.bridge.nativeToken nativeToken!: Nullable<RegisteredAccountAsset>;
  @getter.bridge.sender sender!: string;
  @getter.bridge.recipient recipient!: string;
  @getter.bridge.soraNetworkFee soraNetworkFee!: CodecString;
  @getter.bridge.externalNetworkFee externalNetworkFee!: CodecString;
  @getter.assets.xor xor!: RegisteredAccountAsset;

  get nativeTokenSymbol(): string {
    return this.nativeToken?.symbol ?? '';
  }

  get nativeTokenDecimals(): number | undefined {
    return this.nativeToken?.externalDecimals;
  }

  get outgoingMaxAmount(): FPNumber | null {
    const filtered = [this.assetLockedBalance, this.outgoingMaxLimit].filter((item) => !!item) as FPNumber[];

    if (!filtered.length) return null;

    return FPNumber.min(...filtered);
  }

  isGreaterThanOutgoingMaxAmount(
    amount: string,
    asset: Nullable<RegisteredAccountAsset>,
    isSoraToEvm: boolean,
    isRegisteredAsset = true
  ): boolean {
    if (!(asset && isRegisteredAsset && isSoraToEvm && this.outgoingMaxAmount)) return false;

    const fpAmount = new FPNumber(amount);

    return FPNumber.gt(fpAmount, this.outgoingMaxAmount);
  }

  isLowerThanIncomingMinAmount(
    amount: string,
    asset: Nullable<RegisteredAccountAsset>,
    isSoraToEvm: boolean,
    isRegisteredAsset = true
  ) {
    if (!(asset && isRegisteredAsset && !isSoraToEvm)) return false;

    const fpAmount = new FPNumber(amount);

    return FPNumber.lt(fpAmount, this.incomingMinAmount);
  }

  handleViewTransactionsHistory(): void {
    router.push({ name: PageNames.BridgeTransactionsHistory });
  }

  navigateToBridge(): void {
    router.push({ name: PageNames.Bridge });
  }
}
