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
        :value="xorValue"
        :decimals="(tokenXOR || {}).decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="getMax((tokenXOR || {}).address)"
        @input="handleInputXor"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">
              {{ t(`referralProgram.${isBond ? 'deposit' : 'action.unbond'}`) }}
            </span>
          </div>
          <div v-if="tokenXOR && tokenXOR.balance" class="input-value">
            <span class="input-value--uppercase">{{ t('referralProgram.balance') }}</span>
            <formatted-amount-with-fiat-value
              value-can-be-hidden
              with-left-shift
              value-class="input-value--primary"
              :value="xorBalance"
              :fiat-value="fiatXorBalance"
            />
          </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button
            v-if="tokenXOR && isMaxButtonAvailable"
            class="el-button--max s-typography-button--small"
            type="primary"
            alternative
            size="mini"
            border-radius="mini"
            @click="handleMaxValue"
          >
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button class="el-button--select-token" :token="tokenXOR" />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <formatted-amount v-if="tokenXOR && tokenXorPrice" is-fiat-value :value="tokenXorFiatAmount" />
          <token-address
            v-if="tokenXOR"
            :name="tokenXOR.name"
            :symbol="tokenXOR.symbol"
            :address="tokenXOR.address"
            class="input-value"
          />
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
import { Action, Getter, State } from 'vuex-class';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { getMaxValue, hasInsufficientBalance, asZeroValue, formatAssetBalance } from '@/utils';
import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';

const namespace = 'referrals';

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
  @State((state) => state[namespace].xorValue) xorValue!: string;

  @Getter networkFees!: NetworkFeesObject;
  @Getter('isBond', { namespace }) isBond!: boolean;
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset;

  @Action('setXorValue', { namespace }) setXorValue!: (xorValue: string) => Promise<void>;
  @Action('getAssets', { namespace: 'assets' }) getAssets!: AsyncVoidFn;

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  showConfirmBondDialog = false;

  get isTokenXorSet(): boolean {
    return !!this.tokenXOR;
  }

  get isBondedBalance(): boolean {
    return !this.isBond;
  }

  get xorSymbol(): string {
    return ` ${KnownSymbols.XOR}`;
  }

  get bondedXOR(): string {
    return this.tokenXOR?.balance?.bonded || '';
  }

  get xorBalance(): Nullable<string> {
    return formatAssetBalance(this.tokenXOR, { isBondedBalance: this.isBondedBalance });
  }

  get fiatXorBalance(): Nullable<string> {
    return this.isBond ? this.getFiatBalance(this.tokenXOR) : this.getFiatAmountByCodecString(this.bondedXOR);
  }

  get hasZeroAmount(): boolean {
    return asZeroValue(this.xorValue);
  }

  get tokenXorFiatAmount(): string {
    return this.xorValue ? this.getFiatAmountByString(this.xorValue, this.tokenXOR) || '0' : '0';
  }

  get isMaxButtonAvailable(): boolean {
    const decimals = this.tokenXOR.decimals;
    const balance = this.getFPNumberFromCodec(this.tokenXOR.balance.transferable, decimals);
    const amount = this.getFPNumber(this.xorValue, decimals);
    if (this.fpNumberNetworkFee.isZero()) {
      return false;
    }
    if (this.isBondedBalance) {
      return (
        !FPNumber.eq(this.getFPNumberFromCodec(this.tokenXOR.balance.bonded, decimals), FPNumber.ZERO) &&
        FPNumber.gt(balance, this.fpNumberNetworkFee)
      );
    }
    return !FPNumber.eq(this.fpNumberNetworkFee, balance.sub(amount)) && FPNumber.gt(balance, this.fpNumberNetworkFee);
  }

  get isInsufficientBondedXor(): boolean {
    return !!hasInsufficientBalance(this.tokenXOR, this.xorValue, this.networkFee, false, this.isBondedBalance);
  }

  get isInsufficientXorForFee(): boolean {
    if (this.isBondedBalance) {
      return FPNumber.gt(
        this.fpNumberNetworkFee,
        this.getFPNumberFromCodec(this.tokenXOR.balance.transferable, this.tokenXOR.decimals)
      );
    }
    return !!hasInsufficientBalance(this.tokenXOR, this.xorValue, this.networkFee);
  }

  get tokenXorPrice(): Nullable<CodecString> {
    return this.tokenXOR ? this.getAssetFiatPrice(this.tokenXOR) : null;
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
    return !this.isTokenXorSet || this.hasZeroAmount || this.isInsufficientXorForFee || this.isInsufficientBondedXor;
  }

  handleInputXor(value: string): void {
    if (value === this.xorValue) return;
    this.setXorValue(value);
  }

  handleMaxValue(): void {
    this.handleInputXor(getMaxValue(this.tokenXOR, this.networkFee, false, this.isBondedBalance));
  }

  handleConfirmBond(): void {
    this.showConfirmBondDialog = true;
  }

  async confirmBond(isBondConfirmed: boolean): Promise<void> {
    if (isBondConfirmed) {
      this.setXorValue('');
      this.handleBack();
    }
  }

  handleBack(): void {
    router.push({ name: PageNames.Referral });
  }

  destroyed(): void {
    this.setXorValue('');
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
