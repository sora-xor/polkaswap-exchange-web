<template>
  <div class="setup-price-alert">
    <span class="setup-price-alert__title">{{ t('alerts.alertTypeTitle') }}</span>
    <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.typeTooltip')" placement="top" tabindex="-1">
      <s-icon name="info-16" size="16px" />
    </s-tooltip>
    <s-tabs class="setup-price-alert__tab" v-model="currentTypeTab" type="rounded">
      <s-tab v-for="tab in AlertTypeTabs" :key="tab" :label="t(`alerts.${tab}`)" :name="tab" />
    </s-tabs>
    <s-float-input
      v-model="amount"
      class="price-input"
      size="medium"
      has-locale-string
      :delimiters="delimiters"
      :decimals="asset.decimals"
      :placeholder="formattedFiatValue"
      :maxlength="8"
    >
      <div v-if="amount" slot="left" class="price-input__prefix">$</div>
      <div class="price-input-inner" slot="top">
        <div>{{ `${asset.symbol} price` }}</div>
        <div class="price-input-inner-ratio">
          <span class="price-input-current-title">{{ 'current price' }}</span>
          <formatted-amount-with-fiat-value
            value-can-be-hidden
            value-class="input-value--primary"
            value="1"
            :asset-symbol="asset.symbol"
            :fiat-value="rate"
          />
        </div>
      </div>
      <token-select-button
        slot="right"
        class="el-button--select-token"
        icon="chevron-down-rounded-16"
        :token="asset"
        :tabindex="0"
        @click.stop="openSelectAssetDialog"
      />
      <div class="info" slot="bottom">
        <span class="delta-percent">
          <span :class="activeSignClass('+')"> + </span>
          <span class="slash">/</span>
          <span :class="activeSignClass('-')"> - </span> {{ getDeltaPercentage() }}%
        </span>
        <div class="asset-highlight">
          {{ asset.name || asset.symbol }}
          <s-tooltip :content="copyValueAssetId" tabindex="-1">
            <span class="asset-id" @click="handleCopyAddress(asset.address, $event)">
              ({{ getFormattedAddress(asset) }})
            </span>
          </s-tooltip>
        </div>
      </div>
    </s-float-input>
    <span class="setup-price-alert__title">{{ t('alerts.alertFrequencyTitle') }}</span>
    <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.frequencyTooltip')" placement="top" tabindex="-1">
      <s-icon name="info-16" size="16px" />
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
    <alerts-select-asset
      :visible.sync="showSelectTokenDialog"
      :asset="asset"
      :disabled-custom="true"
      @select="selectAsset"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';
import { AccountAsset, Asset, WhitelistIdsBySymbol } from '@sora-substrate/util/build/assets/types';

import { getter, mutation, state } from '@/store/decorators';
import { formatAddress } from '@/utils';
import { AlertFrequencyTabs, AlertTypeTabs } from '@/types/tabs';
import { lazyComponent } from '@/router';
import { Components, MAX_ALERTS_NUMBER } from '@/consts';
import type { Alert } from '@soramitsu/soraneo-wallet-web/lib/types/common';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
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

  @getter.assets.whitelistAssets assets!: Array<Asset>;
  @getter.assets.xor private xor!: AccountAsset;
  @getter.wallet.account.whitelistIdsBySymbol private whitelistIdsBySymbol!: WhitelistIdsBySymbol;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => AccountAsset;

  @mutation.wallet.settings.addPriceAlert addPriceAlert!: (alert: Alert) => void;
  @mutation.wallet.settings.editPriceAlert editPriceAlert!: (alert: any) => void;

  @Prop({ default: null, type: Object }) readonly alertToEdit!: any;

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  showSelectTokenDialog = false;

  amount = '';
  asset = {} as AccountAsset;
  negativeDelta = false;

  currentTypeTab: AlertTypeTabs = AlertTypeTabs.Drop;
  currentFrequencyTab: AlertFrequencyTabs = AlertFrequencyTabs.Once;

  AlertFrequencyTabs = AlertFrequencyTabs;
  AlertTypeTabs = AlertTypeTabs;

  get rate(): Nullable<string> {
    return this.getFiatAmount('1', this.asset);
  }

  getDeltaPercentage(): string {
    const desiredPrice = this.amount.replace('$', '');
    const currentPrice = this.formattedFiatValue.replace('$', '');

    const price1 = FPNumber.fromNatural(desiredPrice);
    const price2 = FPNumber.fromNatural(currentPrice);

    if (FPNumber.eq(price1, price2) || !this.amount) {
      this.negativeDelta = false;
      return '0.00';
    }

    const delta = price1.sub(price2);
    let percent = delta.div(price2).mul(FPNumber.HUNDRED);

    if (FPNumber.lt(percent, FPNumber.ZERO)) {
      this.currentTypeTab = AlertTypeTabs.Drop;
      this.negativeDelta = true;
      percent = percent.negative();
    } else {
      this.currentTypeTab = AlertTypeTabs.Raise;
      this.negativeDelta = false;
    }
    return this.getFormattedValue(percent.toLocaleString());
  }

  get formattedFiatValue(): string {
    const value = this.getFiatAmount('1', this.asset);
    if (!value) return '';
    return `$${this.getFormattedValue(value)}`;
  }

  getFormattedValue(value: string) {
    const [integer, decimal = '00'] = value.split(FPNumber.DELIMITERS_CONFIG.decimal);
    return `${integer}.${decimal.substring(0, 2)}`;
  }

  get copyValueAssetId(): string {
    return this.copyTooltip(this.t('assets.assetId'));
  }

  get btnDisabled(): boolean {
    return !this.amount;
  }

  get isEditMode(): boolean {
    return this.alertToEdit !== null;
  }

  activeSignClass(sign): string {
    if (sign === '+' && this.negativeDelta) return 'delta-percent--not-active';
    if (sign === '-' && !this.negativeDelta) return 'delta-percent--not-active';
    return '';
  }

  handleAlertCreation(): void {
    if (this.isEditMode) {
      const type = this.currentTypeTab;
      const once = this.currentFrequencyTab === 'once';
      this.editPriceAlert({
        alert: { token: this.asset.symbol, price: this.amount, type, once },
        position: this.alertToEdit.position,
      });
      this.$emit('back');
      return;
    }

    if (this.alerts.length > MAX_ALERTS_NUMBER) return;
    const type = this.currentTypeTab;
    const once = this.currentFrequencyTab === 'once';
    this.addPriceAlert({ token: this.asset.symbol, price: this.amount, type, once });
    this.$emit('back');
  }

  openSelectAssetDialog(): void {
    this.showSelectTokenDialog = true;
  }

  selectAsset(selectedAsset?): void {
    // TODO: disallow XSTUSD asset to choose in asset list
    if (!selectedAsset) return;
    this.asset = selectedAsset;
  }

  getFormattedAddress(asset: AccountAsset): string | undefined {
    if (!asset.address) return;
    return formatAddress(asset.address, 10);
  }

  mounted(): void {
    if (this.isEditMode) {
      this.amount = this.alertToEdit.price;
      this.currentTypeTab = this.alertToEdit.type;
      this.currentFrequencyTab = this.alertToEdit.once ? AlertFrequencyTabs.Once : AlertFrequencyTabs.Always;
      this.selectAsset(this.getAsset(this.whitelistIdsBySymbol[this.alertToEdit.token]));
    } else {
      this.amount = '';
      this.currentTypeTab = AlertTypeTabs.Drop;
      this.currentFrequencyTab = AlertFrequencyTabs.Once;
      this.selectAsset(this.xor);
    }
  }
}
</script>

<style lang="scss">
.price-input {
}
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
    font-size: 14px;
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

  .asset-highlight {
    margin-left: auto;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-extra-mini);
    font-weight: 300;
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-small);
    text-align: right;
  }
}
</style>
