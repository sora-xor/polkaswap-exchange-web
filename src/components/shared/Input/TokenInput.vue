<template>
  <s-float-input
    class="s-input--token-value"
    size="medium"
    has-locale-string
    v-bind="{
      decimals,
      delimiters,
      max,
      value,
      ...$attrs,
    }"
    v-on="$listeners"
  >
    <div slot="top" class="input-line">
      <div class="input-title">
        <span class="input-title--uppercase input-title--primary">{{ title }}</span>
        <slot name="title-append" />
      </div>
      <div class="input-value">
        <slot name="balance">
          <template v-if="isBalanceAvailable">
            <span class="input-value--uppercase">{{ t('balanceText') }}</span>
            <formatted-amount-with-fiat-value
              value-can-be-hidden
              with-left-shift
              value-class="input-value--primary"
              :value="formattedBalance"
              :has-fiat-value="!!tokenPrice"
              :fiat-value="formattedFiatBalance"
            />
          </template>
        </slot>
      </div>
    </div>
    <div slot="right" class="s-flex el-buttons">
      <s-button
        v-if="isMaxAvailable"
        class="el-button--max s-typography-button--small"
        type="primary"
        alternative
        size="mini"
        border-radius="mini"
        @click.stop="handleMax"
      >
        {{ t('buttons.max') }}
      </s-button>
      <token-select-button
        icon="chevron-down-rounded-16"
        :disabled="!isSelectAvailable"
        :token="token"
        @click.stop="handleSelectToken"
      />
    </div>
    <div slot="bottom" class="input-line input-line--footer">
      <div class="asset-info">
        <div class="s-flex">
          <formatted-amount v-if="!!tokenPrice" is-fiat-value :value="fiatAmount" />
          <slot name="fiat-amount-append" />
        </div>
        <token-address
          v-if="token"
          :name="token.name"
          :symbol="token.symbol"
          :address="token.address"
          class="input-value"
        />
      </div>
      <div v-if="withSlider">
        <div class="delimiter" />
        <s-slider
          class="slider-container"
          :value="sliderValue"
          :disabled="!withSlider"
          :show-tooltip="false"
          :marks="{ 0: '', 25: '', 50: '', 75: '', 100: '' }"
          @input="handleSlideInputChange"
        />
      </div>
    </div>
  </s-float-input>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, ModelSync, Prop } from 'vue-property-decorator';

import InputSliderMixin from '@/components/mixins/InputSliderMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';
import { getter } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    TokenAddress: components.TokenAddress,
  },
})
export default class TokenInput extends Mixins(
  mixins.NumberFormatterMixin,
  mixins.FormattedAmountMixin,
  InputSliderMixin,
  TranslationMixin
) {
  @Prop({ default: () => null, type: Object }) readonly token!: Nullable<AccountAsset>;
  @Prop({ default: () => null, type: String }) readonly balance!: Nullable<CodecString>;
  @Prop({ default: '', type: String }) readonly title!: string;
  @Prop({ default: false, type: Boolean }) readonly isMaxAvailable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isSelectAvailable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly withSlider!: boolean;

  @ModelSync('value', 'input', { type: String })
  readonly amount!: string;

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  @getter.wallet.account.isLoggedIn private isLoggedIn!: boolean;

  sliderValue = 45;

  get isBalanceAvailable(): boolean {
    return this.isLoggedIn && !!this.token;
  }

  get address(): string {
    return this.token?.address ?? '';
  }

  get decimals(): number {
    return this.token?.decimals ?? FPNumber.DEFAULT_PRECISION;
  }

  get max(): string {
    return this.MaxInputNumber;
  }

  get fpBalance(): FPNumber {
    if (!this.token || !this.balance) return FPNumber.ZERO;

    return FPNumber.fromCodecValue(this.balance, this.decimals);
  }

  get formattedBalance(): string {
    return this.fpBalance.toLocaleString();
  }

  get formattedFiatBalance(): string {
    if (!this.token || !this.balance) return ZeroStringValue;

    const fpTokenPrice = FPNumber.fromCodecValue(this.tokenPrice ?? 0, this.decimals);

    return this.fpBalance.mul(fpTokenPrice).toLocaleString();
  }

  get tokenPrice(): Nullable<CodecString> {
    if (!this.token) return null;

    return this.getAssetFiatPrice(this.token);
  }

  get fiatAmount(): Nullable<string> {
    if (!this.token) return null;

    return this.getFiatAmount(this.amount, this.token);
  }

  handleMax(): void {
    this.$emit('max', this.token);
  }

  handleSelectToken(): void {
    this.$emit('select');
  }

  handleSlideInputChange(value: string): void {
    this.sliderValue = Number(value);
    this.$emit('slide', value);
  }
}
</script>

<style lang="scss">
.s-input--token-value .el-input .el-input__inner {
  @include text-ellipsis;
}

.input-line.input-line--footer {
  @include input-slider;

  .el-slider__button {
    background-color: #fff;
    border-radius: 4px;
    transform: rotate(-45deg);
  }

  .el-slider__stop {
    height: 10px;
    width: 10px;
    border-radius: 2px;
    top: -1.8px;
    border: 1.3px solid var(--s-color-base-content-tertiary);
    transform: translateX(-50%) rotate(-45deg);
  }

  .asset-info {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }

  .delimiter {
    background-color: var(--s-color-base-border-secondary);
    width: 100%;
    height: 1px;
    margin: 14px 0 4px 0;
  }
}
</style>

<style lang="scss" scoped>
.s-input--token-value {
  @include buttons;
}
</style>
