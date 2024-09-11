<template>
  <dialog-base :visible.sync="isVisible" :title="title" custom-class="dialog--confirm-swap">
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ upperText }}</span>
        <token-logo class="token-logo" :token="baseAsset" />
      </div>
      <div class="tokens-info-container">
        <span class="token-value">{{ lowerText }}</span>
        <token-logo class="token-logo" :token="quoteAsset" />
      </div>
    </div>

    <place-transaction-details class="transaction-details" :is-market-type="isMarketType" />
    <template #footer>
      <account-confirmation-option with-hint class="confirmation-option" />
      <s-button
        type="primary"
        class="s-typography-button--large"
        :disabled="isInsufficientBalance"
        @click="handleConfirm"
      >
        {{ t('exchange.confirm') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
    AccountConfirmationOption: components.AccountConfirmationOption,
    PlaceTransactionDetails: lazyComponent(Components.PlaceTransactionDetails),
  },
})
export default class PlaceLimitOrder extends Mixins(TranslationMixin, mixins.DialogMixin) {
  @state.orderBook.baseValue private baseValue!: string;
  @state.orderBook.quoteValue private quoteValue!: string;
  @state.swap.toValue private toValue!: string;

  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;

  @Prop({ default: false, type: Boolean }) readonly isMarketType!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean;
  @Prop({ default: true, type: Boolean }) readonly isBuySide!: boolean;

  get title(): string {
    return this.isMarketType ? this.t('orderBook.dialog.placeMarket') : this.t('orderBook.dialog.placeLimit');
  }

  get upperText(): string {
    const symbol = this.baseAsset?.symbol;

    if (this.isMarketType) {
      return this.isBuySide
        ? this.t('orderBook.dialog.buy', { amount: this.toValue, symbol })
        : this.t('orderBook.dialog.sell', { amount: this.baseValue, symbol });
    } else {
      return this.isBuySide
        ? this.t('orderBook.dialog.buy', { amount: this.baseValue, symbol })
        : this.t('orderBook.dialog.sell', { amount: this.baseValue, symbol });
    }
  }

  get lowerText(): string {
    return this.t('orderBook.dialog.at', { price: this.quoteValue, symbol: this.quoteAsset?.symbol });
  }

  async handleConfirm(): Promise<void> {
    this.$emit('confirm');
    this.isVisible = false;
  }
}
</script>

<style lang="scss">
.dialog--confirm-swap {
  .transaction-number {
    color: var(--s-color-base-content-primary);
    font-weight: 600;
    word-break: break-all;
  }
}

.limit-order-type--buy {
  .info-line-value {
    color: #34ad87;
  }
}

.limit-order-type--sell {
  .info-line-value {
    color: #f754a3;
  }
}
</style>

<style lang="scss" scoped>
.transaction-details {
  margin-top: $basic-spacing;
}

.tokens {
  display: flex;
  flex-direction: column;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
  &-info-container {
    display: flex;
    align-items: center;
    font-weight: 800;
  }

  .token-logo {
    margin-left: $basic-spacing;
  }
}

.confirmation-option {
  margin-bottom: $inner-spacing-medium;
}
</style>
