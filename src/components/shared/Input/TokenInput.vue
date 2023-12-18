<template>
  <s-float-input
    class="token-input"
    size="medium"
    has-locale-string
    :disabled="disabled"
    :value="value"
    :max="maxValue"
    v-bind="{
      decimals,
      delimiters,
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
              :has-fiat-value="hasFiatValue"
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
        :loading="loading"
        :disabled="disabled"
        @click.stop="handleMax"
      >
        {{ t('buttons.max') }}
      </s-button>
      <token-select-button
        v-if="token || isSelectAvailable"
        icon="chevron-down-rounded-16"
        :disabled="!isSelectAvailable"
        :token="token"
        @click.stop="handleSelectToken"
      />
    </div>

    <template #bottom>
      <slot name="bottom">
        <div class="input-line input-line--footer">
          <div v-if="hasFiatValue" class="s-flex">
            <s-float-input
              class="token-input--fiat"
              size="mini"
              has-locale-string
              :decimals="2"
              :delimiters="$attrs.delimiters"
              :disabled="disabled"
              :max="maxFiatValueFormatted"
              :readonly="!isFiatEditable"
              :value="fiatValue"
              @input="setFiatValue"
              @focus="handleFiatFocus"
              @blur="handleFiatBlur"
            >
              <span slot="left" class="input-prefix">$</span>
            </s-float-input>

            <slot name="fiat-amount-append" />
          </div>

          <token-address v-if="address" v-bind="token" :external="external" class="input-value" />
        </div>
      </slot>

      <slot />
    </template>
  </s-float-input>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

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
  TranslationMixin
) {
  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  @Prop({ type: String }) readonly value!: string;
  @Prop({ type: [String, Number] }) readonly max!: string | number;
  @Prop({ default: () => null, type: Object }) readonly token!: Nullable<RegisteredAccountAsset>;
  @Prop({ default: () => null, type: String }) readonly balance!: Nullable<CodecString>;
  @Prop({ default: '', type: String }) readonly title!: string;
  @Prop({ default: false, type: Boolean }) readonly external!: boolean;
  @Prop({ default: false, type: Boolean }) readonly loading!: boolean;
  @Prop({ default: false, type: Boolean }) readonly disabled!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isMaxAvailable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isSelectAvailable!: boolean;
  @Prop({ default: true, type: Boolean }) readonly isFiatEditable!: boolean;
  @Prop({ default: 2, type: Number }) readonly fiatDecimals!: number;

  fiatValue = '';
  fiatFocus = false;

  @Watch('fiatAmount')
  private updateFiatValue(): void {
    if (this.fiatFocus) return;

    this.fiatValue = this.fiatAmount.isZero() ? '' : this.fiatAmount.toFixed(this.fiatDecimals);
  }

  recalcValue(fiatValue: string): void {
    const result =
      !this.tokenPrice.isZero() && fiatValue ? new FPNumber(fiatValue).div(this.tokenPrice).toString() : '';

    this.$emit('input', result);
  }

  setFiatValue(fiatValue: string): void {
    this.fiatValue =
      fiatValue === this.maxFiatValueFormatted ? this.maxFiatValue.toFixed(this.fiatDecimals) : fiatValue;

    this.recalcValue(fiatValue);
  }

  handleFiatFocus(): void {
    this.fiatFocus = true;
    this.$emit('focus');
  }

  handleFiatBlur(): void {
    this.fiatFocus = false;
  }

  get isBalanceAvailable(): boolean {
    return !!this.balance && !!this.token;
  }

  get address(): string {
    const address = this.external ? this.token?.externalAddress : this.token?.address;
    return address ?? '';
  }

  get decimals(): number {
    const tokenDecimals = this.external ? this.token?.externalDecimals : this.token?.decimals;

    return tokenDecimals ?? FPNumber.DEFAULT_PRECISION;
  }

  get tokenPrice(): FPNumber {
    if (!this.token) return FPNumber.ZERO;
    return FPNumber.fromCodecValue(this.getAssetFiatPrice(this.token) ?? ZeroStringValue);
  }

  get hasFiatValue(): boolean {
    return !this.tokenPrice.isZero();
  }

  get fpBalance(): FPNumber {
    return FPNumber.fromCodecValue(this.balance ?? ZeroStringValue, this.decimals);
  }

  get formattedBalance(): string {
    return this.fpBalance.toLocaleString();
  }

  get formattedFiatBalance(): string {
    return this.fpBalance.mul(this.tokenPrice).toLocaleString();
  }

  get fiatAmount(): FPNumber {
    return this.calcFiatAmount(this.value);
  }

  get maxValue(): string | number {
    return this.max || this.MaxInputNumber;
  }

  get maxFiatValue(): FPNumber {
    return this.calcFiatAmount(this.maxValue);
  }

  get maxFiatValueFormatted(): string {
    return this.maxFiatValue.toString();
  }

  calcFiatAmount(value: string | number): FPNumber {
    if (!value) return FPNumber.ZERO;
    return new FPNumber(value).mul(this.tokenPrice);
  }

  handleMax(): void {
    this.$emit('max', this.token);
  }

  handleSelectToken(): void {
    this.$emit('select');
  }
}
</script>

<style lang="scss">
$el-input-class: '.el-input';

.s-input.token-input {
  & > .s-input__content {
    #{$el-input-class} {
      #{$el-input-class}__inner {
        padding-top: 0;
      }
    }
    #{$el-input-class}__inner {
      @include text-ellipsis;
      height: var(--s-size-small);
      padding-right: 0;
      padding-left: 0;
      border-radius: 0 !important;
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-large);
      line-height: var(--s-line-height-small);
      font-weight: 800;
    }
    .s-placeholder {
      display: none;
    }
  }

  &--fiat {
    padding: 0;
    min-height: initial;
    box-shadow: none !important;
    border-radius: 0;

    & > .s-input__content {
      color: var(--s-color-fiat-value);
      line-height: var(--s-line-height-medium);
      letter-spacing: var(--s-letter-spacing-small);
      font-size: var(--s-font-size-small);
      font-weight: 400;

      .input-prefix {
        padding-right: calc(var(--s-basic-spacing) / 4);
      }

      #{$el-input-class}__inner {
        color: inherit;
        letter-spacing: inherit;
      }
    }

    &:focus,
    &:focus-within {
      outline: none;
    }
  }
}
</style>

<style lang="scss" scoped>
.token-input {
  @include buttons;
}
</style>
