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
        :loading="loading"
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

    <template #bottom>
      <div class="input-line input-line--footer">
        <div v-if="!!tokenPrice" class="s-flex">
          <formatted-amount is-fiat-value :value="fiatAmount" />
          <slot name="fiat-amount-append" />
        </div>

        <token-address v-if="address" v-bind="token" :external="external" class="input-value" />
      </div>

      <slot />
    </template>
  </s-float-input>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, ModelSync, Prop } from 'vue-property-decorator';

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
  @Prop({ default: () => null, type: Object }) readonly token!: Nullable<RegisteredAccountAsset>;
  @Prop({ default: () => null, type: String }) readonly balance!: Nullable<CodecString>;
  @Prop({ default: false, type: Boolean }) readonly external!: boolean;
  @Prop({ default: '', type: String }) readonly title!: string;
  @Prop({ default: false, type: Boolean }) readonly loading!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isMaxAvailable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isSelectAvailable!: boolean;

  @ModelSync('value', 'input', { type: String })
  readonly amount!: string;

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

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
}
</script>

<style lang="scss">
$swap-input-class: '.el-input';

.s-input--token-value {
  & > .s-input__content {
    #{$swap-input-class} {
      #{$swap-input-class}__inner {
        padding-top: 0;
      }
    }
    #{$swap-input-class}__inner {
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
}
</style>

<style lang="scss" scoped>
.s-input--token-value {
  @include buttons;
}
</style>
