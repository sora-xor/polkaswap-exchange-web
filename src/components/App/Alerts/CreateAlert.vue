<template>
  <div class="setup-price-alert">
    <span class="setup-price-alert__title">{{ t('alerts.alertTypeTitle') }}</span>
    <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.typeTooltip')" placement="top" tabindex="-1">
      <s-icon name="info-16" size="14px" />
    </s-tooltip>
    <s-tabs class="setup-price-alert__tab" v-model="currentTypeTab" type="rounded" @click="handleTabClick">
      <s-tab v-for="tab in AlertTypeTabs" :key="tab" :label="t(`alerts.${tab}`)" :name="tab" />
    </s-tabs>
    <s-float-input
      v-model="amount"
      class="price-input"
      size="medium"
      has-locale-string
      :delimiters="delimiters"
      :decimals="asset.decimals"
      :placeholder="`$${placeholder}`"
      :maxlength="9"
    >
      <div v-if="amount" slot="left" class="price-input__prefix">$</div>
      <div class="price-input-inner" slot="top">
        <div>{{ `${asset.symbol} ${t('exchange.price')}` }}</div>
        <div class="price-input-inner-ratio">
          <span class="price-input-current-title">{{ t('alerts.currentPrice') }}</span>
          <formatted-amount-with-fiat-value
            value-can-be-hidden
            value-class="input-value--primary"
            value="1"
            :asset-symbol="asset.symbol"
            :fiat-value="fiatAmountValue"
          />
        </div>
      </div>
      <token-select-button
        slot="right"
        class="el-button--select-token"
        icon="chevron-down-rounded-16"
        :token="asset"
        @click.stop="openSelectAssetDialog"
      />
      <div class="info" slot="bottom">
        <span class="delta-percent">
          <span :class="activeSignClass('+')"> + </span>
          <span class="slash">/</span>
          <span :class="activeSignClass('-')"> - </span> {{ deltaPercentage }}%
        </span>
        <token-address v-bind="asset" />
      </div>
    </s-float-input>
    <span class="setup-price-alert__title">{{ t('alerts.alertFrequencyTitle') }}</span>
    <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.frequencyTooltip')" placement="top" tabindex="-1">
      <s-icon name="info-16" size="14px" />
    </s-tooltip>
    <s-tabs class="setup-price-alert__tab" v-model="currentFrequencyTab" type="rounded">
      <s-tab v-for="tab in AlertFrequencyTabs" :key="tab" :label="t(`alerts.${tab}`)" :name="tab" />
    </s-tabs>
    <s-button
      type="primary"
      class="setup-price-alert__btn s-typography-button--large"
      :loading="loading"
      :disabled="btnDisabled"
      @click="handleAlertCreation"
    >
      {{ t('alerts.finishBtn') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';

import { Components, MAX_ALERTS_NUMBER, ZeroStringValue } from '@/consts';
import type { EditableAlertObject, NumberedAlert } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, mutation, state } from '@/store/decorators';
import { AlertFrequencyTabs, AlertTypeTabs } from '@/types/tabs';
import { calcPriceChange, showMostFittingValue } from '@/utils';

import type { AccountAsset, WhitelistIdsBySymbol } from '@sora-substrate/util/build/assets/types';
import type { Alert } from '@soramitsu/soraneo-wallet-web/lib/types/common';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    TokenAddress: components.TokenAddress,
    AlertsSelectAsset: lazyComponent(Components.SelectToken),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
  },
})
export default class CreateAlert extends Mixins(
  mixins.CopyAddressMixin,
  mixins.TranslationMixin,
  mixins.TransactionMixin,
  mixins.LoadingMixin,
  mixins.FormattedAmountMixin
) {
  @state.wallet.settings.alerts alerts!: Array<Alert>;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.wallet.account.whitelistIdsBySymbol private whitelistIdsBySymbol!: WhitelistIdsBySymbol;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => AccountAsset;

  @mutation.wallet.settings.addPriceAlert addPriceAlert!: (alert: Alert) => void;
  @mutation.wallet.settings.editPriceAlert editPriceAlert!: (alert: EditableAlertObject) => void;

  @Prop({ default: null, type: Object }) readonly alertToEdit!: NumberedAlert;

  @Watch('negativeDelta')
  private updateChoise(value: boolean): void {
    if (this.autoChoice) {
      this.currentTypeTab = value ? AlertTypeTabs.Drop : AlertTypeTabs.Raise;
    }

    this.autoChoice = true;
  }

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  amount = '';
  asset = {} as AccountAsset;
  autoChoice = true;

  currentTypeTab: AlertTypeTabs = AlertTypeTabs.Drop;
  currentFrequencyTab: AlertFrequencyTabs = AlertFrequencyTabs.Once;

  readonly AlertFrequencyTabs = AlertFrequencyTabs;
  readonly AlertTypeTabs = AlertTypeTabs;

  get assetPrice(): FPNumber {
    return FPNumber.fromCodecValue(this.getAssetFiatPrice(this.asset) ?? ZeroStringValue);
  }

  get priceChange(): FPNumber {
    const price = FPNumber.fromNatural(this.amount);
    const desired = price.isZero() ? this.assetPrice : price;
    return calcPriceChange(desired, this.assetPrice);
  }

  get negativeDelta(): boolean {
    return FPNumber.lt(this.priceChange, FPNumber.ZERO);
  }

  get deltaPercentage(): string {
    const value = this.negativeDelta ? this.priceChange.negative() : this.priceChange;
    return showMostFittingValue(value);
  }

  get placeholder(): string {
    return showMostFittingValue(this.assetPrice);
  }

  handleTabClick(): void {
    this.autoChoice = false;
  }

  get fiatAmountValue(): string {
    return this.assetPrice.toLocaleString();
  }

  get btnDisabled(): boolean {
    return !this.amount;
  }

  get isEditMode(): boolean {
    return this.alertToEdit !== null;
  }

  activeSignClass(sign: string): string {
    if (sign === '+' && this.negativeDelta) return 'delta-percent--not-active';
    if (sign === '-' && !this.negativeDelta) return 'delta-percent--not-active';
    return '';
  }

  handleAlertCreation(): void {
    const desiredPrice = FPNumber.fromNatural(this.amount);
    const currentPrice = FPNumber.fromNatural(this.fiatAmountValue);
    let wasNotified = false;

    // NOTE: handle abnormal situation when user wants specific alert despite the market
    if (this.currentTypeTab === 'drop') {
      if (FPNumber.lt(currentPrice, desiredPrice)) wasNotified = true;
    } else if (this.currentTypeTab === 'raise') {
      if (FPNumber.gt(currentPrice, desiredPrice)) wasNotified = true;
    }

    if (this.isEditMode) {
      this.editPriceAlert({
        alert: {
          token: this.asset.symbol,
          price: this.amount,
          type: this.currentTypeTab,
          once: this.currentFrequencyTab === 'once',
          wasNotified,
        },
        position: this.alertToEdit.position,
      });
      this.$emit('back');
      return;
    }

    if (this.alerts.length > MAX_ALERTS_NUMBER) return;

    this.addPriceAlert({
      token: this.asset.symbol,
      price: this.amount,
      type: this.currentTypeTab,
      once: this.currentFrequencyTab === 'once',
      wasNotified,
    });
    this.$emit('back');
  }

  openSelectAssetDialog(): void {
    this.$emit('open-select-token');
  }

  selectAsset(selectedAsset?: AccountAsset): void {
    if (!selectedAsset) return;
    this.asset = selectedAsset;
  }

  mounted(): void {
    if (this.isEditMode) {
      this.amount = this.alertToEdit.price;
      this.currentTypeTab = this.alertToEdit.type === 'drop' ? AlertTypeTabs.Drop : AlertTypeTabs.Raise;
      this.currentFrequencyTab = this.alertToEdit.once ? AlertFrequencyTabs.Once : AlertFrequencyTabs.Always;
      this.selectAsset(this.getAsset(this.whitelistIdsBySymbol[this.alertToEdit.token]));
    } else {
      this.amount = '';
      this.currentTypeTab = AlertTypeTabs.Drop;
      this.currentFrequencyTab = AlertFrequencyTabs.Once;
      this.selectAsset(this.xor);
    }

    this.$root.$on('selectAlertAsset', (selectedAsset: AccountAsset) => {
      this.selectAsset(selectedAsset);
    });
  }
}
</script>

<style lang="scss">
.price-input {
  margin-bottom: $basic-spacing;

  &__prefix {
    font-size: var(--s-font-size-large);
    line-height: var(--s-line-height-small);
    font-weight: 700;
  }

  &-inner {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: $inner-spacing-mini;
    font-size: var(--s-font-size-mini);
    font-weight: 300;
    line-height: var(--s-line-height-medium);
    text-transform: uppercase;

    &-ratio {
      display: flex;
      .formatted-amount--fiat-value {
        text-align: right;
        margin-left: calc(var(--s-basic-spacing) / 2);
      }
    }
  }

  &-current {
    &-title {
      color: var(--s-color-base-content-secondary);
      margin-right: calc(var(--s-basic-spacing) / 2);
      display: inline-flex;
      align-items: baseline;
    }
  }

  .el-input__inner {
    font-size: var(--s-font-size-large);
    line-height: var(--s-line-height-small);
    font-weight: 700;
  }

  i.s-icon-info-16 {
    color: var(--s-color-base-content-tertiary);
    &:hover {
      cursor: pointer;
    }
  }

  .asset-id:hover {
    cursor: pointer;
    text-decoration: underline;
  }
}
</style>

<style lang="scss">
.setup-price-alert {
  @include custom-tabs;

  &__tab {
    margin-bottom: #{$basic-spacing-medium};
  }

  &__title {
    font-weight: 600;
    margin-bottom: $inner-spacing-mini;
    margin-right: 6px;
    display: inline-block;
    font-size: var(--s-font-size-small);
    line-height: 18px;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    color: var(--s-color-base-content-secondary);
  }

  &__btn {
    width: 100%;
    margin-bottom: $basic-spacing;
  }
}

.info {
  display: flex;
  align-items: baseline;
  justify-content: space-between;

  .delta-percent {
    margin-right: calc(var(--s-basic-spacing) / 2);
    font-weight: 600;
    color: var(--s-color-fiat-value);
    font-family: var(--s-font-family-default);
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-small);
    .slash {
      opacity: 40%;
    }

    &--not-active {
      opacity: 40%;
    }
  }
}
</style>
