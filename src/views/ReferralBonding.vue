<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header
      has-button-back
      :title="t(`referralProgram.${isBond ? 'bondTitle' : 'unbondTitle'}`)"
      @back="handleBack"
    />
    <s-form class="el-form--actions" :show-message="false">
      <s-float-input
        class="s-input--token-value"
        size="medium"
        :value="amount"
        :decimals="xorDecimals"
        has-locale-string
        :delimiters="delimiters"
        :max="xorMaxValue"
        @input="handleInputXor"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">
              {{ t(`referralProgram.${isBond ? 'deposit' : 'action.unbond'}`) }}
            </span>
          </div>
          <div v-if="xorBalance && xorBalance.transferable" class="input-value">
            <span class="input-value--uppercase">{{ t('referralProgram.balance') }}</span>
            <formatted-amount-with-fiat-value
              value-can-be-hidden
              with-left-shift
              value-class="input-value--primary"
              :value="xorFormattedBondedBalance"
              :fiat-value="xorFormattedFiatBalance"
            />
          </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button
            v-if="isMaxButtonAvailable"
            class="el-button--max s-typography-button--small"
            type="primary"
            alternative
            size="mini"
            border-radius="mini"
            @click="handleMaxValue"
          >
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button class="el-button--select-token" :token="xor" />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <formatted-amount v-if="xorPrice" is-fiat-value :value="formattedFiatAmount" />
          <token-address :name="xor.name" :symbol="xorSymbol" :address="xorAddress" class="input-value" />
        </div>
      </s-float-input>
      <s-button
        class="action-button s-typography-button--large"
        type="primary"
        :disabled="isConfirmBondDisabled"
        @click="handleConfirmBond"
      >
        <template v-if="hasZeroAmount">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('referralProgram.insufficientBalance', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="isBondedBalance && isInsufficientBondedXor">
          {{ t('referralProgram.insufficientBondedBalance') }}
        </template>
        <template v-else>
          {{ t(`referralProgram.action.${isBond ? 'bond' : 'unbond'}`) }}
        </template>
      </s-button>
      <info-line
        :label="t('referralProgram.networkFee')"
        :label-tooltip="t('referralProgram.networkFeeTooltip')"
        :value="formattedNetworkFee"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      />
      <referrals-confirm-bonding :visible.sync="showConfirmBondDialog" @confirm="confirmBond" />
    </s-form>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, AccountBalance } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { getMaxValue, hasInsufficientBalance, asZeroValue, formatAssetBalance } from '@/utils';
import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { getter, mutation, state } from '@/store/decorators';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress),
    ReferralsConfirmBonding: lazyComponent(Components.ReferralsConfirmBonding),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    InfoLine: components.InfoLine,
  },
})
export default class ReferralBonding extends Mixins(
  mixins.FormattedAmountMixin,
  TranslationMixin,
  mixins.LoadingMixin
) {
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.referrals.amount amount!: string;

  @getter.assets.xor xor!: AccountAsset;

  @mutation.referrals.setAmount private setAmount!: (amount: string) => void;
  @mutation.referrals.resetAmount private resetAmount!: VoidFunction;

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  showConfirmBondDialog = false;

  get xorSymbol(): string {
    return this.xor.symbol;
  }

  get xorDecimals(): number {
    return this.xor.decimals;
  }

  get xorAddress(): string {
    return this.xor.address;
  }

  get xorMaxValue(): string {
    return this.getMax(this.xorAddress);
  }

  get xorBalance(): Nullable<AccountBalance> {
    return this.xor.balance;
  }

  get xorFormattedBondedBalance(): Nullable<string> {
    return formatAssetBalance(this.xor, { isBondedBalance: this.isBondedBalance });
  }

  get xorFormattedFiatBalance(): Nullable<string> {
    return this.isBond
      ? this.getFiatBalance(this.xor)
      : this.getFiatAmountByCodecString(this.xorBalance?.bonded ?? '0');
  }

  get isBond(): boolean {
    return this.$route.name === PageNames.ReferralBonding;
  }

  get isBondedBalance(): boolean {
    return !this.isBond;
  }

  get hasZeroAmount(): boolean {
    return asZeroValue(this.amount);
  }

  get formattedFiatAmount(): string {
    return this.amount ? this.getFiatAmountByString(this.amount, this.xor) ?? '0' : '0';
  }

  get isMaxButtonAvailable(): boolean {
    const balance = this.getFPNumberFromCodec(this.xorBalance?.transferable ?? '0', this.xorDecimals);
    const amount = this.getFPNumber(this.amount, this.xorDecimals);
    if (this.fpNumberNetworkFee.isZero()) {
      return false;
    }
    if (this.isBondedBalance) {
      return (
        !FPNumber.eq(this.getFPNumberFromCodec(this.xorBalance?.bonded ?? '0', this.xorDecimals), this.Zero) &&
        FPNumber.gt(balance, this.fpNumberNetworkFee)
      );
    }
    return !FPNumber.eq(this.fpNumberNetworkFee, balance.sub(amount)) && FPNumber.gt(balance, this.fpNumberNetworkFee);
  }

  get isInsufficientBondedXor(): boolean {
    return !!hasInsufficientBalance(this.xor, this.amount, this.networkFee, false, this.isBondedBalance);
  }

  get isInsufficientXorForFee(): boolean {
    if (this.isBondedBalance) {
      return FPNumber.gt(
        this.fpNumberNetworkFee,
        this.getFPNumberFromCodec(this.xorBalance?.transferable ?? '0', this.xorDecimals)
      );
    }
    return !!hasInsufficientBalance(this.xor, this.amount, this.networkFee);
  }

  get xorPrice(): Nullable<CodecString> {
    return this.getAssetFiatPrice(this.xor);
  }

  get networkFee(): CodecString {
    return this.networkFees[this.isBond ? Operation.ReferralReserveXor : Operation.ReferralUnreserveXor];
  }

  get fpNumberNetworkFee(): FPNumber {
    return this.getFPNumberFromCodec(this.networkFee);
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get isConfirmBondDisabled(): boolean {
    return this.hasZeroAmount || this.isInsufficientXorForFee || this.isInsufficientBondedXor;
  }

  handleInputXor(value: string): void {
    if (value === this.amount) return;
    this.setAmount(value);
  }

  handleMaxValue(): void {
    this.handleInputXor(getMaxValue(this.xor, this.networkFee, false, this.isBondedBalance));
  }

  handleConfirmBond(): void {
    this.showConfirmBondDialog = true;
  }

  async confirmBond(isBondConfirmed: boolean): Promise<void> {
    if (isBondConfirmed) {
      this.resetAmount();
      this.handleBack();
    }
  }

  handleBack(): void {
    router.push({ name: PageNames.Referral });
  }

  destroyed(): void {
    this.resetAmount();
  }
}
</script>

<style lang="scss">
.bonding-preview {
  margin-bottom: $inner-spacing-medium;
  font-size: 13px;
  line-height: var(--s-line-height-medium);
  text-align: center;
  a {
    color: var(--s-color-theme-accent);
  }
}
</style>

<style lang="scss" scoped>
.el-form--actions {
  @include buttons;
  @include full-width-button('action-button');

  .action-button {
    margin-bottom: $inner-spacing-medium;
  }
}
</style>
