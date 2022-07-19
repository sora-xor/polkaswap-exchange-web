<template>
  <s-float-input
    class="s-input--token-value"
    size="medium"
    has-locale-string
    :decimals="decimals"
    :delimiters="delimiters"
    :max="max"
    :value="amount"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <div slot="top" class="input-line">
      <div class="input-title">
        <span class="input-title--uppercase input-title--primary">{{ title }}</span>
      </div>
      <div v-if="token" class="input-value">
        <span class="input-value--uppercase">{{ t('balanceText') }}</span>
        <formatted-amount-with-fiat-value
          value-can-be-hidden
          with-left-shift
          value-class="input-value--primary"
          :value="formattedBalance"
          :fiat-value="formattedFiatBalance"
        />
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
        @click="handleMax"
      >
        {{ t('buttons.max') }}
      </s-button>
      <token-select-button
        class="el-button--select-token"
        :icon="selectTokenIcon"
        :token="token"
        @click="handleSelectToken"
      />
    </div>
    <div slot="bottom" class="input-line input-line--footer">
      <formatted-amount v-if="tokenPrice" is-fiat-value :value="fiatAmount" />
      <token-address
        v-if="token"
        :name="token.name"
        :symbol="token.symbol"
        :address="token.address"
        class="input-value"
      />
    </div>
  </s-float-input>
</template>

<script lang="ts">
import { Component, Mixins, ModelSync, Prop } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { formatAssetBalance } from '@/utils';
import { lazyComponent } from '@/router';
import { Components, ZeroStringValue } from '@/consts';

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
  TranslationMixin
) {
  @Prop({ default: () => null, type: Object }) readonly token!: Nullable<AccountAsset>;
  @Prop({ default: '', type: String }) readonly title!: string;
  @Prop({ default: false, type: Boolean }) readonly isMaxAvailable: boolean;
  @Prop({ default: false, type: Boolean }) readonly isSelectAvailable: boolean;

  @ModelSync('value', 'input', { type: String })
  readonly amount!: string;

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  get address(): string {
    return this.token?.address ?? '';
  }

  get decimals(): number {
    return this.token?.decimals ?? FPNumber.DEFAULT_PRECISION;
  }

  get max(): string {
    return this.getMax(this.address);
  }

  get selectTokenIcon(): Nullable<string> {
    return this.isSelectAvailable ? 'chevron-down-rounded-16' : undefined;
  }

  get formattedBalance(): string {
    if (!this.token) return ZeroStringValue;

    return formatAssetBalance(this.token);
  }

  get formattedFiatBalance(): string {
    if (!this.token) return ZeroStringValue;

    return this.getFiatBalance(this.token);
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
.s-input--token-value .el-input .el-input__inner {
  @include text-ellipsis;
}
</style>

<style lang="scss" scoped>
.s-input--token-value {
  @include buttons;
}
</style>
