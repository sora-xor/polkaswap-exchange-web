import { FPNumber } from '@sora-substrate/sdk';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { PageNames } from '@/consts';
import router from '@/router';
import { getter, state } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component
export default class BridgeMixin extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @state.bridge.externalNativeBalance externalNativeBalance!: CodecString;
  @state.bridge.assetLockedBalance assetLockedBalance!: Nullable<FPNumber>;
  @state.bridge.assetExternalMinBalance assetExternalMinBalance!: CodecString;
  @state.bridge.outgoingMinLimit outgoingMinLimit!: Nullable<FPNumber>;
  @state.bridge.outgoingMaxLimit outgoingMaxLimit!: Nullable<FPNumber>;
  @state.bridge.incomingMinLimit incomingMinAmount!: FPNumber;
  @state.bridge.soraNetworkFee soraNetworkFee!: CodecString;
  @state.bridge.externalTransferFee externalTransferFee!: CodecString;
  @state.bridge.isSoraToEvm isSoraToEvm!: boolean;

  @getter.web3.isValidNetwork isValidNetwork!: boolean;
  @getter.bridge.asset asset!: Nullable<RegisteredAccountAsset>;
  @getter.bridge.nativeToken nativeToken!: Nullable<RegisteredAccountAsset>;
  @getter.bridge.sender sender!: string;
  @getter.bridge.recipient recipient!: string;
  @getter.bridge.externalNetworkFee externalNetworkFee!: CodecString;
  @getter.bridge.isNativeTokenSelected isNativeTokenSelected!: boolean;
  @getter.bridge.isSidechainAsset isSidechainAsset!: boolean;
  @getter.assets.xor xor!: RegisteredAccountAsset;

  get nativeTokenSymbol(): string {
    return this.nativeToken?.symbol ?? '';
  }

  get nativeTokenDecimals(): number | undefined {
    return this.nativeToken?.externalDecimals;
  }

  get externalTransferFeeFP(): FPNumber {
    return FPNumber.fromCodecValue(this.externalTransferFee, this.asset?.externalDecimals);
  }

  get outgoingMaxAmount(): FPNumber | null {
    const locks = [this.outgoingMaxLimit];

    if (this.isSidechainAsset) locks.push(this.assetLockedBalance);

    const filtered = locks.filter((item) => !!item) as FPNumber[];

    if (!filtered.length) return null;

    return FPNumber.min(...filtered);
  }

  get outgoingMinAmount(): FPNumber | null {
    if (!this.outgoingMinLimit) return null;
    // this fee is spend from transfer amount, so we add it to outgoing min limit
    // [TODO: Bridge] remove when limit will be defined on backend
    const transferFee = this.isNativeTokenSelected ? this.externalTransferFeeFP : FPNumber.ZERO;
    // minimum amount = existential deposit + xcm fee
    return this.outgoingMinLimit.add(transferFee);
  }

  get incomingMaxAmount(): FPNumber | null {
    if (this.isSidechainAsset) return null;

    return this.assetLockedBalance ?? null;
  }

  getTransferMaxAmount(isOutgoing: boolean): FPNumber | null {
    return isOutgoing ? this.outgoingMaxAmount : this.incomingMaxAmount;
  }

  getTransferMinAmount(isOutgoing: boolean): FPNumber | null {
    return isOutgoing ? this.outgoingMinAmount : this.incomingMinAmount;
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
