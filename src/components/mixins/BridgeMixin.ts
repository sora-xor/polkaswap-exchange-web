import { FPNumber } from '@sora-substrate/util';
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
  @state.bridge.outgoingMaxLimit outgoingMaxLimit!: Nullable<CodecString>;
  @state.bridge.incomingMinLimit incomingMinLimit!: CodecString;

  @getter.web3.isValidNetwork isValidNetwork!: boolean;
  @getter.bridge.asset asset!: Nullable<RegisteredAccountAsset>;
  @getter.bridge.nativeToken nativeToken!: Nullable<RegisteredAccountAsset>;
  @getter.bridge.sender sender!: string;
  @getter.bridge.recipient recipient!: string;
  @getter.bridge.soraNetworkFee soraNetworkFee!: CodecString;
  @getter.bridge.externalNetworkFee externalNetworkFee!: CodecString;
  @getter.assets.xor xor!: RegisteredAccountAsset;

  @mutation.web3.setSelectNetworkDialogVisibility setSelectNetworkDialogVisibility!: (flag: boolean) => void;

  get nativeTokenSymbol(): string {
    return this.nativeToken?.symbol ?? '';
  }

  get nativeTokenDecimals(): number | undefined {
    return this.nativeToken?.externalDecimals;
  }

  get lockedBalance(): FPNumber | null {
    if (!(this.asset && this.assetLockedBalance)) return null;

    return FPNumber.fromCodecValue(this.assetLockedBalance, this.asset.externalDecimals);
  }

  get incomingMinBalance(): FPNumber {
    if (!this.asset) return FPNumber.ZERO;

    return FPNumber.fromCodecValue(this.incomingMinLimit, this.asset.externalDecimals);
  }

  get outgoingMaxBalance(): FPNumber | null {
    if (!(this.asset && this.outgoingMaxLimit)) return null;

    return FPNumber.fromCodecValue(this.outgoingMaxLimit, this.asset.decimals);
  }

  get outgoingLimitBalance(): FPNumber | null {
    const filtered = [this.lockedBalance, this.outgoingMaxBalance].filter((item) => item !== null) as FPNumber[];

    if (!filtered.length) return null;

    return FPNumber.min(...filtered);
  }

  isGreaterThanOutgoingMaxAmount(
    amount: string,
    asset: Nullable<RegisteredAccountAsset>,
    isSoraToEvm: boolean,
    isRegisteredAsset = true
  ): boolean {
    if (!(asset && isRegisteredAsset && isSoraToEvm && this.outgoingLimitBalance)) return false;

    const fpAmount = new FPNumber(amount);

    return FPNumber.gt(fpAmount, this.outgoingLimitBalance);
  }

  isLowerThanIncomingMinAmount(
    amount: string,
    asset: Nullable<RegisteredAccountAsset>,
    isSoraToEvm: boolean,
    isRegisteredAsset = true
  ) {
    if (!(asset && isRegisteredAsset && !isSoraToEvm && this.incomingMinBalance)) return false;

    const fpAmount = new FPNumber(amount);

    return FPNumber.lt(fpAmount, this.incomingMinBalance);
  }
}
