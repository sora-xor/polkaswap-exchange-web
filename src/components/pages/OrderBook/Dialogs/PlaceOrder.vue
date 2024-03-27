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
      <s-button type="primary" class="s-typography-button--large" :disabled="loading" @click="handleConfirmSwap">
        {{ t('exchange.confirm') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
    PlaceTransactionDetails: lazyComponent(Components.PlaceTransactionDetails),
  },
})
export default class PlaceLimitOrder extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  @state.orderBook.baseValue private baseValue!: string;
  @state.orderBook.quoteValue private quoteValue!: string;
  @state.orderBook.side private side!: PriceVariant;
  @state.settings.slippageTolerance private slippageTolerance!: string;
  @state.swap.fromValue private fromValue!: string;
  @state.swap.toValue private toValue!: string;
  @state.swap.selectedDexId private selectedDexId!: number;

  @getter.swap.tokenFrom private tokenFrom!: AccountAsset;
  @getter.swap.tokenTo private tokenTo!: AccountAsset;

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

  private placeLimitOrder(): Promise<void> {
    return api.orderBook.placeLimitOrder(this.baseAsset, this.quoteAsset, this.quoteValue, this.baseValue, this.side);
  }

  private placeMarketOrder(): Promise<void> {
    return api.swap.execute(
      this.tokenFrom,
      this.tokenTo,
      this.fromValue,
      this.toValue,
      this.slippageTolerance,
      this.isBuySide,
      LiquiditySourceTypes.OrderBook,
      this.selectedDexId
    );
  }

  private async singlePriceReachedLimit(): Promise<boolean> {
    if (this.isMarketType || !this.quoteValue) return false;

    const limitReached = !(await api.orderBook.isOrderPlaceable(
      this.baseAsset.address,
      this.quoteAsset.address,
      this.side,
      this.quoteValue
    ));

    return limitReached;
  }

  async handleConfirmSwap(): Promise<void> {
    if (this.isInsufficientBalance) {
      this.$alert(
        this.t('exchange.insufficientBalance', { tokenSymbol: this.tokenFrom ? this.tokenFrom.symbol : '' }),
        { title: this.t('errorText') }
      );
      this.$emit('confirm');
      this.isVisible = false;
      return;
    }
    try {
      await this.withNotifications(async () => {
        const isLimitReached = await this.singlePriceReachedLimit();
        if (isLimitReached) {
          this.$alert(this.t('orderBook.error.singlePriceLimit.reading'), { title: this.t('errorText') });
          this.$emit('confirm');
        } else {
          const orderExtrinsic = this.isMarketType ? this.placeMarketOrder : this.placeLimitOrder;
          await orderExtrinsic();
          this.$emit('confirm', true);
        }
      });
    } catch (error) {
      this.$emit('confirm');
    }
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
</style>
