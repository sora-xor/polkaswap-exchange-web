import { FPNumber } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { PageNames } from '@/consts';
import router from '@/router';
import { getter, state } from '@/store/decorators';
import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

@Component
export default class BridgeMixin extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @state.bridge.externalNativeBalance externalNativeBalance!: CodecString;
  @state.bridge.assetLockedBalance assetLockedBalance!: Nullable<FPNumber>;
  @state.bridge.outgoingMaxLimit outgoingMaxLimit!: Nullable<FPNumber>;
  @state.bridge.incomingMinLimit incomingMinAmount!: FPNumber;
  @state.bridge.soraNetworkFee soraNetworkFee!: CodecString;
  @state.bridge.isSoraToEvm isSoraToEvm!: boolean;

  @getter.web3.isValidNetwork isValidNetwork!: boolean;
  @getter.bridge.asset asset!: Nullable<RegisteredAccountAsset>;
  @getter.bridge.nativeToken nativeToken!: Nullable<RegisteredAccountAsset>;
  @getter.bridge.sender sender!: string;
  @getter.bridge.recipient recipient!: string;
  @getter.bridge.externalNetworkFee externalNetworkFee!: CodecString;
  @getter.assets.xor xor!: RegisteredAccountAsset;

  get nativeTokenSymbol(): string {
    return this.nativeToken?.symbol ?? '';
  }

  get nativeTokenDecimals(): number | undefined {
    return this.nativeToken?.externalDecimals;
  }

  get assetLockedOnSora(): boolean {
    return !subBridgeApi.isSoraParachain(this.networkSelected as SubNetwork);
  }

  get outgoingMaxAmount(): FPNumber | null {
    const locks = [this.outgoingMaxLimit];

    if (this.assetLockedOnSora) locks.push(this.assetLockedBalance);

    const filtered = locks.filter((item) => !!item) as FPNumber[];

    if (!filtered.length) return null;

    return FPNumber.min(...filtered);
  }

  get incomingMaxAmount(): FPNumber | null {
    if (this.assetLockedOnSora) return null;

    return this.assetLockedBalance ?? null;
  }

  getTransferMaxAmount(isOutgoing: boolean): FPNumber | null {
    return isOutgoing ? this.outgoingMaxAmount : this.incomingMaxAmount;
  }

  getTransferMinAmount(isOutgoing: boolean): FPNumber | null {
    return isOutgoing ? null : this.incomingMinAmount;
  }

  isGreaterThanTransferMaxAmount(
    amount: string,
    asset: Nullable<RegisteredAccountAsset>,
    isSoraToEvm: boolean,
    isRegisteredAsset = true
  ): boolean {
    const maxAmount = this.getTransferMaxAmount(isSoraToEvm);

    if (!(asset && isRegisteredAsset && maxAmount)) return false;

    const fpAmount = new FPNumber(amount);

    return FPNumber.gt(fpAmount, maxAmount);
  }

  isLowerThanTransferMinAmount(
    amount: string,
    asset: Nullable<RegisteredAccountAsset>,
    isSoraToEvm: boolean,
    isRegisteredAsset = true
  ) {
    const minAmount = this.getTransferMinAmount(isSoraToEvm);

    if (!(asset && isRegisteredAsset && minAmount)) return false;

    const fpAmount = new FPNumber(amount);

    return FPNumber.lt(fpAmount, minAmount);
  }

  handleViewTransactionsHistory(): void {
    router.push({ name: PageNames.BridgeTransactionsHistory });
  }

  navigateToBridge(): void {
    router.push({ name: PageNames.Bridge });
  }
}
